import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Function from "effect/Function"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"

import type { AuthCredentialCommand, CredentialSlot } from "../operations/credentials.ts"
import { type AuthRevealCommandCollector, snapshotRevealCommands } from "../operations/reveals.ts"
import { markAuthFailureReported, reportAuthFailure, ReportedOperationDefect } from "../shared/diagnostics.ts"
import { timeoutOrElseWithCause } from "../shared/timeout.ts"
import { headerName } from "./configurationSchema.ts"
import { type AnyRoute, HttpRequestBody, type RouteFailure, type RouteInput, type RouteSuccess } from "./contract.ts"
import { OperationHttpError } from "./errors.ts"
import type { HttpCredentials } from "./models.ts"
import { credentialSlots, CredentialWire, decodeRevealWire, RevealWire } from "./private.ts"

/** Client-owned finite reveal storage. Its Layer owns allocation and disposal. */
export interface PrivateOutput extends AuthRevealCommandCollector {
  readonly clear: Effect.Effect<void>
}

/** Native credential storage, separate from HTTP header configuration. */
export interface NativeCredentials {
  readonly read: Effect.Effect<HttpCredentials, OperationHttpError>
  readonly accept: (
    commands: ReadonlyArray<AuthCredentialCommand>
  ) => Effect.Effect<void, OperationHttpError>
}

export interface OperationFetchOptions<R = never, RNative = never> {
  readonly baseUrl: string
  readonly csrfHeader: string
  readonly csrfValue: string
  readonly maximumResponseBytes?: number
  /** Finite deadline for request dispatch and response body consumption. Defaults to 30 seconds.
   * A timeout does not establish whether a mutation committed and never authorizes a retry. */
  readonly requestTimeout?: Duration.Input
  readonly privateOutput?: Context.Key<R, PrivateOutput>
  readonly native?: {
    readonly modeHeader: string
    readonly requestHeaders: Readonly<Record<CredentialSlot, string>>
    readonly responseHeaders: Readonly<Record<CredentialSlot, string>>
    readonly credentials: Context.Key<RNative, NativeCredentials>
  }
}

export interface OperationCallOptions<Success = unknown> {
  readonly replaceSubject?: boolean | ((success: Success) => boolean)
  /** Runs inside credential admission after fencing old responses. The callback
   * must not call this client's transition or start another credential call. */
  readonly onTransition?: Effect.Effect<void>
}

export interface OperationFetchClient {
  readonly call: <R extends AnyRoute>(
    route: R,
    input: RouteInput<R>,
    options?: OperationCallOptions<RouteSuccess<R>>
  ) => Effect.Effect<
    RouteSuccess<R>,
    RouteFailure<R> | OperationHttpError,
    | R["operation"]["rpc"]["successSchema"]["DecodingServices"]
    | R["operation"]["rpc"]["errorSchema"]["DecodingServices"]
  >
  /** Wait for admitted credential responses, then fence old queries and clear reveals.
   * All authenticated subject changes for this client must pass this boundary. */
  readonly transition: Effect.Effect<void>
  readonly generation: Effect.Effect<number>
}

/** One transport instance per application or request Scope. Provide its Layer
 * to consumers so credential admission and generation fencing share an owner. */
export class Client extends Context.Service<Client, OperationFetchClient>()(
  "@effect/auth/OperationHttpClient"
) {}

/** Complete an authentication operation and publish its subject while its
 * credential response remains admitted. Undefined preserves a pending flow. */
export interface OperationAuthenticationCompletion {
  <R extends AnyRoute>(
    route: R,
    input: RouteInput<R>,
    fromSuccess: (success: RouteSuccess<R>) => string | null | undefined,
    options?: {
      readonly onTransition?: Effect.Effect<void>
      /** Transport generation captured by the caller, checked under the admission gate. */
      readonly expectedGeneration?: number
    }
  ): Effect.Effect<
    RouteSuccess<R>,
    RouteFailure<R> | OperationHttpError,
    | R["operation"]["rpc"]["successSchema"]["DecodingServices"]
    | R["operation"]["rpc"]["errorSchema"]["DecodingServices"]
  >
}

/**
 * The caller owns the lifecycle gate and publisher. Publishers must not call
 * the transport: they run under credential admission, before reveal acceptance.
 *
 * @internal
 */
export const makeAuthenticationCompletion = Effect.fnUntraced(function*(
  gate: Semaphore.Semaphore,
  publishSubject: (subject: string | null) => Effect.Effect<void>
) {
  const client = yield* Client

  const complete: OperationAuthenticationCompletion = Effect.fn(
    "OperationHttpClient.completeAuthentication"
  )(function*<R extends AnyRoute>(
    route: R,
    input: RouteInput<R>,
    fromSuccess: (success: RouteSuccess<R>) => string | null | undefined,
    options?: {
      readonly onTransition?: Effect.Effect<void>
      readonly expectedGeneration?: number
    }
  ) {
    const started = options?.expectedGeneration ?? (yield* client.generation)

    return yield* gate.withPermits(1)(
      Effect.gen(function*() {
        if ((yield* client.generation) !== started) {
          return yield* OperationHttpError.make({ reason: "stale-response" })
        }

        return yield* Effect.uninterruptible(
          Effect.gen(function*() {
            let nextSubject: string | null | undefined

            return yield* client.call(route, input, {
              replaceSubject: (value) => {
                nextSubject = fromSuccess(value)

                return nextSubject !== undefined
              },
              onTransition: Effect.suspend(() =>
                nextSubject === undefined
                  ? Effect.void
                  : publishSubject(nextSubject).pipe(
                    Effect.andThen(options?.onTransition ?? Effect.void)
                  )
              )
            })
          }).pipe(
            // A failed response can follow a cookie already accepted by the
            // browser. Remove the old account state without replaying the call.
            Effect.onError(Effect.fnUntraced(function*() {
              yield* client.transition
              yield* publishSubject(null)
              yield* options?.onTransition ?? Effect.void
            }))
          )
        )
      })
    )
  })

  return complete
})

const responseCodec = Schema.fromJsonString(
  Schema.Union([
    Schema.TaggedStruct("Success", {
      value: Schema.optionalKey(Schema.Json),
      private: Schema.optionalKey(Schema.Array(RevealWire))
    }),
    Schema.TaggedStruct("Failure", { error: Schema.Json }),
    Schema.TaggedStruct("TransportFailure", { reason: Schema.String })
  ])
)

const credentialCodec = Schema.fromJsonString(CredentialWire)
const encodeBody = HttpClientRequest.schemaBodyJson(HttpRequestBody)

// FetchHttpClient's text/json accessors do not enforce MaxBodySize. Consume its
// scoped Stream with a byte bound and strict UTF-8 before decoding the envelope.
const readBody = Effect.fnUntraced(function*(
  response: HttpClientResponse.HttpClientResponse,
  maximum: number
) {
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let size = 0

  const chunks = yield* response.stream.pipe(
    Stream.mapEffect(
      Effect.fnUntraced(function*(chunk) {
        size += chunk.length
        if (size > maximum) return yield* OperationHttpError.make({ reason: "response" })

        return yield* Effect.try({
          try: () => decoder.decode(chunk, { stream: true }),
          catch: () => OperationHttpError.make({ reason: "response" })
        })
      })
    ),
    Stream.runCollect
  )

  return yield* Effect.try({
    try: () => chunks.join("") + decoder.decode(),
    catch: () => OperationHttpError.make({ reason: "response" })
  })
})

/** One instance owns credential ordering and stale-result fencing. Share it within
 * an authentication lifetime. Supply a non-retrying, non-redirecting HttpClient;
 * each call owns its request Scope, including response consumption. */
export const make = Effect.fn("OperationHttpClient.make")(function*<R = never, RNative = never>(
  options: OperationFetchOptions<R, RNative>
): Effect.fn.Return<OperationFetchClient, OperationHttpError, HttpClient.HttpClient | R | RNative> {
  const privateOutput = options.privateOutput === undefined ? undefined : yield* options.privateOutput

  const native = options.native === undefined
    ? undefined
    : { config: options.native, store: yield* options.native.credentials }

  const base = yield* Effect.try({
    try: () => new URL(options.baseUrl),
    catch: () => OperationHttpError.make({ reason: "request" })
  })

  const timeout = Duration.fromInput(options.requestTimeout ?? "30 seconds")

  if (
    Option.isNone(timeout) ||
    !Duration.isFinite(timeout.value) ||
    !Duration.isPositive(timeout.value) ||
    !Number.isSafeInteger(options.maximumResponseBytes ?? 1048576) ||
    (options.maximumResponseBytes ?? 1048576) < 1 ||
    (options.maximumResponseBytes ?? 1048576) > 1048576 ||
    !/^x-[a-z0-9-]{1,61}$/.test(options.csrfHeader) ||
    options.csrfValue.length < 1 ||
    options.csrfValue.length > 128 ||
    !["https:", "http:"].includes(base.protocol) ||
    base.username !== "" ||
    base.password !== "" ||
    base.search !== "" ||
    base.hash !== ""
  ) {
    return yield* OperationHttpError.make({ reason: "request" })
  }
  if (native !== undefined) {
    const names = [
      native.config.modeHeader,
      ...credentialSlots.map((slot) => native.config.requestHeaders[slot])
    ]

    const response = credentialSlots.map((slot) => native.config.responseHeaders[slot])

    if (
      [...names, ...response].some((name) => !Schema.is(headerName)(name)) ||
      new Set(names).size !== names.length ||
      new Set(response).size !== response.length ||
      names.includes(options.csrfHeader)
    ) {
      return yield* OperationHttpError.make({ reason: "request" })
    }
  }
  const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.withScope)
  const gate = yield* Semaphore.make(1)
  let generation = 0

  const advance = Effect.gen(function*() {
    generation++
    if (privateOutput !== undefined) yield* privateOutput.clear
  })

  const call = Effect.fn("OperationHttpClient.call")(function*<R extends AnyRoute>(
    route: R,
    input: RouteInput<R>,
    callOptions?: OperationCallOptions<RouteSuccess<R>>
  ): Effect.fn.Return<
    RouteSuccess<R>,
    RouteFailure<R> | OperationHttpError,
    | R["operation"]["rpc"]["successSchema"]["DecodingServices"]
    | R["operation"]["rpc"]["errorSchema"]["DecodingServices"]
  > {
    const started = generation
    let failureReason: OperationHttpError["reason"] = "request"
    let domainFailure: { readonly value: RouteFailure<R> } | undefined

    const services = yield* Effect.context<
      | R["operation"]["rpc"]["successSchema"]["DecodingServices"]
      | R["operation"]["rpc"]["errorSchema"]["DecodingServices"]
    >()

    type DecoderServices =
      | R["operation"]["rpc"]["successSchema"]["DecodingServices"]
      | R["operation"]["rpc"]["errorSchema"]["DecodingServices"]

    // The route generic retains the exact schemas while heterogeneous property
    // access widens them to Rpc.AnyWithProps. Restore that relationship locally.
    const successSchema = route.operation.rpc.successSchema as Schema.Codec<
      RouteSuccess<R>,
      unknown,
      DecoderServices,
      unknown
    >

    const errorSchema = route.operation.rpc.errorSchema as Schema.Codec<
      RouteFailure<R>,
      unknown,
      DecoderServices,
      unknown
    >

    if (
      route.operation.reveals.some(
        (kind) =>
          privateOutput === undefined ||
          !privateOutput.supportedKinds.includes(kind) ||
          !route.reveals.includes(kind)
      )
    ) {
      return yield* OperationHttpError.make({ reason: "private-output" })
    }

    const work = Effect.gen(function*() {
      if (started !== generation) {
        return yield* OperationHttpError.make({ reason: "stale-response" })
      }

      const payload = input === undefined
        ? undefined
        // oxlint-disable-next-line no-restricted-properties -- untyped input is validated for JSON transport compatibility.
        : yield* Schema.decodeUnknownEffect(Schema.Json)(input).pipe(
          Effect.mapError(() => OperationHttpError.make({ reason: "request" }))
        )

      if (route.method === "GET" && input !== undefined) {
        return yield* OperationHttpError.make({ reason: "request" })
      }

      let request = HttpClientRequest.make(route.method)(new URL(route.path, base).href)

      if (route.method !== "GET") {
        request = yield* encodeBody(request, payload === undefined ? {} : { payload }).pipe(
          Effect.mapError(() => OperationHttpError.make({ reason: "request" }))
        )
        request = HttpClientRequest.setHeader(request, options.csrfHeader, options.csrfValue)
      }

      if (native !== undefined) {
        failureReason = "credentials"
        request = HttpClientRequest.setHeader(request, native.config.modeHeader, "native")
        const credentials = yield* native.store.read

        for (const slot of credentialSlots) {
          if (credentials[slot] !== undefined) {
            request = HttpClientRequest.setHeader(
              request,
              native.config.requestHeaders[slot],
              Redacted.value(credentials[slot]!)
            )
          }
        }
      }

      const guarded = httpClient.pipe(
        HttpClient.transform(Effect.fnUntraced(function*(effect) {
          if (started !== generation) {
            return yield* OperationHttpError.make({ reason: "stale-response" })
          }

          return yield* effect
        }))
      )

      const { response, envelope } = yield* Effect.gen(function*() {
        failureReason = "network"
        const response = yield* guarded.execute(request)

        failureReason = "response"

        if (
          response.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !==
            "application/json"
        ) {
          return yield* OperationHttpError.make({ reason: "response" })
        }

        const envelope = yield* Schema.decodeEffect(responseCodec)(
          yield* readBody(response, options.maximumResponseBytes ?? 1048576)
        ).pipe(Effect.mapError(() => OperationHttpError.make({ reason: "response" })))

        return { response, envelope }
      }).pipe(
        // Native credential header names are application-defined. Preserve any
        // transport-captured redaction policy and keep these exchanges out of HTTP spans.
        native === undefined
          ? Function.identity
          : Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
        Effect.scoped,
        // Only the deadline's child may interrupt the exchange. The admitted
        // caller still waits for settlement before releasing the credential gate.
        Effect.interruptible,
        timeoutOrElseWithCause({
          duration: timeout.value,
          orElse: () => Effect.fail(OperationHttpError.make({ reason: "timeout" }))
        })
      )

      if (started !== generation) {
        return yield* OperationHttpError.make({ reason: "stale-response" })
      }
      if (envelope._tag === "TransportFailure") {
        return yield* OperationHttpError.make({
          reason: envelope.reason === "origin" ||
              envelope.reason === "csrf" ||
              envelope.reason === "credentials" ||
              envelope.reason === "private-output"
            ? envelope.reason
            : "response"
        })
      }
      if (envelope._tag === "Failure") {
        const failure = yield* Schema.decodeEffect(errorSchema)(envelope.error).pipe(
          Effect.provide(services)
        )

        domainFailure = { value: failure }

        return yield* Effect.fail(failure)
      }
      if (response.status < 200 || response.status >= 300) {
        return yield* OperationHttpError.make({ reason: "response" })
      }

      const value = yield* Schema.decodeEffect(successSchema)(envelope.value).pipe(
        Effect.provide(services)
      )

      if (started !== generation) {
        return yield* OperationHttpError.make({ reason: "stale-response" })
      }

      const privateCommands = yield* Effect.try({
        try: () => snapshotRevealCommands((envelope.private ?? []).map(decodeRevealWire), route.reveals),
        catch: () => OperationHttpError.make({ reason: "private-output" })
      }).pipe(
        Effect.flatMap(Effect.fromResult),
        Effect.mapError(() => OperationHttpError.make({ reason: "private-output" }))
      )

      const now = DateTime.toEpochMillis(yield* DateTime.now)

      if (
        privateCommands.some(
          (command) => command.expiresAtMillis <= now || command.expiresAtMillis > now + 300_000
        )
      ) {
        return yield* OperationHttpError.make({ reason: "private-output" })
      }
      if (privateCommands.length > 0 && privateOutput === undefined) {
        return yield* OperationHttpError.make({ reason: "private-output" })
      }
      if (native !== undefined) {
        failureReason = "credentials"
        const commands: Array<AuthCredentialCommand> = []

        for (const slot of credentialSlots) {
          const raw = response.headers[native.config.responseHeaders[slot]]

          if (raw === undefined) continue
          if (!route.operation.credentials) {
            return yield* OperationHttpError.make({ reason: "credentials" })
          }

          const command = yield* Schema.decodeEffect(credentialCodec)(raw).pipe(
            Effect.mapError(() => OperationHttpError.make({ reason: "response" }))
          )

          if (command._tag === "Issue" && command.expiresAtMillis <= now) {
            return yield* OperationHttpError.make({ reason: "credentials" })
          }
          commands.push(
            command._tag === "Clear"
              ? { _tag: "Clear", slot }
              : { ...command, slot, credential: Redacted.make(command.credential) }
          )
        }
        if (commands.length > 0) yield* native.store.accept(commands)
      }
      const projectSubject = callOptions?.replaceSubject

      const replaceSubject = typeof projectSubject === "function"
        ? yield* Effect.sync(() => projectSubject(value as RouteSuccess<R>))
        : projectSubject === true

      if (replaceSubject) {
        yield* advance
        if (callOptions?.onTransition !== undefined) yield* callOptions.onTransition
      }
      failureReason = "private-output"
      if (privateCommands.length > 0 && privateOutput !== undefined) {
        yield* privateOutput.accept(privateCommands)
      }

      return value as RouteSuccess<R>
    })

    // Hold admission for every write, including middleware that delays dispatch.
    // It cannot switch accounts while waiting to send with browser cookies.
    // Credential responses also settle before the lifetime advances.
    const admitted = route.operation.replay !== "read-only" ||
        route.operation.credentials ||
        route.operation.reveals.length > 0 ||
        (callOptions?.replaceSubject !== undefined && callOptions.replaceSubject !== false)
      ? gate.withPermits(1)(Effect.uninterruptible(work))
      : work

    // The complete request Scope (including body cleanup) settles before the
    // public projection. Never select one failure from a mixed Cause.
    return yield* Effect.uninterruptibleMask((restore) =>
      restore(admitted).pipe(
        Effect.catchCause((cause) => {
          const unexpected = cause.reasons.filter(
            (reason) =>
              Cause.isDieReason(reason) ||
              (Cause.isFailReason(reason) &&
                !(domainFailure !== undefined && reason.error === domainFailure.value) &&
                !(
                  Schema.is(OperationHttpError)(reason.error) &&
                  ["request", "stale-response", "origin", "csrf", "credentials"].includes(
                    reason.error.reason
                  )
                ))
          )

          const projected = Cause.fromReasons<RouteFailure<R> | OperationHttpError>(
            cause.reasons.map((reason) => {
              if (Cause.isInterruptReason(reason)) return Cause.makeInterruptReason(reason.fiberId)
              if (Cause.isDieReason(reason)) {
                return Cause.makeDieReason(ReportedOperationDefect.make({}))
              }

              return Cause.makeFailReason(
                domainFailure !== undefined && reason.error === domainFailure.value
                  ? domainFailure.value
                  : Schema.is(OperationHttpError)(reason.error)
                  ? reason.error
                  : OperationHttpError.make({ reason: failureReason })
              )
            })
          )

          return (
            unexpected.length === 0
              ? Effect.void
              : reportAuthFailure("http-client", Cause.fromReasons(unexpected))
          ).pipe(
            // Every projected reason is expected or already reported at its owner.
            Effect.andThen(Effect.failCause(markAuthFailureReported(projected)))
          )
        })
      )
    )
  })

  return {
    call,
    transition: gate.withPermits(1)(advance),
    generation: Effect.sync(() => generation)
  }
})

export const layer = <R = never, RNative = never>(options: OperationFetchOptions<R, RNative>) =>
  Layer.effect(Client, make(options))
