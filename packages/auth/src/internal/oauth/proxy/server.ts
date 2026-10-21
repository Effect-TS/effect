import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { reportAuthFailure, ReportedOperationDefect } from "../../shared/diagnostics.ts"
import { httpsOrigin as Origin } from "../../shared/origin.ts"
import { timeoutWithCause } from "../../shared/timeout.ts"
import type { ProviderDefinition } from "../providerDefinition.ts"
import { OAuthProviderKey } from "../schema.ts"
import {
  OAuthCallbackId,
  OAuthCallbackResponse,
  OAuthProtocolConfiguration,
  OAuthProtocolPreparation,
  OAuthRedirectUri,
  OAuthVerifiedExternalIdentity
} from "../signInModels.ts"
import { makeOAuthSnapshot } from "../signInSnapshot.ts"
import {
  Begin,
  ConfigurationError,
  Environment,
  FlowContext,
  Path,
  Persistence,
  Prepared,
  Protector,
  Random,
  Record,
  Redeem,
  Rejected,
  Unavailable
} from "./models.ts"
import { noStore, readText, secrets } from "./wire.ts"

export interface Options<E = never, R = never> {
  readonly origin: string
  /** Defaults to /oauth-proxy. Provider callbacks are {path}/{provider}/callback. */
  readonly path?: `/${string}`
  readonly providers: Readonly<{ [provider: string]: ProviderDefinition<E, R> }>
  readonly environments: ReadonlyArray<Environment>
}

export class Server extends Context.Service<
  Server,
  {
    readonly paths: ReadonlyArray<`/${string}`>
    readonly handle: (request: Request) => Effect.Effect<Response>
  }
>()("@effect/auth/OAuthProxy/Server") {}

const sameConfiguration = (
  left: typeof OAuthProtocolConfiguration.Type,
  right: typeof OAuthProtocolConfiguration.Type
) =>
  Schema.encodeSync(Schema.fromJsonString(OAuthProtocolConfiguration))(left) ===
    Schema.encodeSync(Schema.fromJsonString(OAuthProtocolConfiguration))(right)

/** No account or session authority is installed on the proxy. Native provider
 * verification completes here; only the initiating environment can redeem it.
 * Five-minute attempts and sixty-second handoffs never extend on replay.
 */
export const layer = <E, R>(options: Options<E, R>) => {
  const origin = options.origin
  const path = options.path ?? "/oauth-proxy"
  const declarations = Object.entries(options.providers)

  const environments = Result.try({
    try: () => options.environments,
    catch: () => ConfigurationError.make({})
  }).pipe(
    Result.flatMap(snapshotEnvironments.result),
    Result.mapError(() => ConfigurationError.make({}))
  )

  return Layer.effect(
    Server,
    Effect.gen(function*() {
      yield* Schema.decodeEffect(Origin)(origin).pipe(
        Effect.mapError(() => ConfigurationError.make({}))
      )
      yield* Schema.decodeEffect(Path)(path).pipe(
        Effect.mapError(() => ConfigurationError.make({}))
      )

      const registered = yield* Effect.fromResult(environments)

      const proxy = `${origin}${path}`

      if (
        registered.length === 0 ||
        registered.length > 256 ||
        declarations.length === 0 ||
        declarations.length > 16 ||
        new Set(registered.map((env) => env.id)).size !== registered.length
      ) {
        return yield* ConfigurationError.make({})
      }

      const installed = yield* Effect.forEach(
        declarations,
        ([name, declaration]) =>
          Effect.gen(function*() {
            const provider = yield* Schema.decodeEffect(OAuthProviderKey)(name).pipe(
              Effect.mapError(() => ConfigurationError.make({}))
            )

            if (!/^[A-Za-z0-9_-]{1,64}$/.test(name)) return yield* ConfigurationError.make({})
            const callbackId = OAuthCallbackId.make(provider)
            const redirectUri = OAuthRedirectUri.make(`${proxy}/${provider}/callback`)

            return {
              provider,
              callbackId,
              redirectUri,
              protocol: yield* declaration.configure({
                provider,
                callbacks: [{ callbackId, redirectUri }]
              })
            }
          }),
        { concurrency: 4 }
      )

      for (const env of registered) {
        const identities = env.callbacks.map(
          (callback) => `${callback.provider}:${callback.callbackId}`
        )

        if (
          new Set(identities).size !== identities.length ||
          env.callbacks.some(
            (callback) => !installed.some((entry) => entry.provider === callback.provider)
          )
        ) {
          return yield* ConfigurationError.make({})
        }
      }

      const persistence = yield* Persistence
      const protector = yield* Protector
      const { random, digest } = yield* secrets

      const credentials = yield* Effect.forEach(
        registered,
        (env) => Effect.map(digest(Redacted.value(env.secret)), (secretDigest) => ({ env, secretDigest }))
      )

      const now = DateTime.now.pipe(Effect.map(DateTime.toEpochMillis))

      const authorize = Effect.fnUntraced(function*(environment: string, request: Request) {
        const credential = request.headers.get("authorization")

        if (
          request.headers.has("origin") ||
          credential === null ||
          !/^Bearer [A-Za-z0-9_-]{43}$/.test(credential)
        ) {
          return yield* Rejected.make({})
        }
        const hashed = yield* digest(credential.slice(7))

        const found = credentials.find(
          ({ env, secretDigest }) => env.id === environment && secretDigest === hashed
        )

        if (found === undefined) return yield* Rejected.make({})

        return found.env
      })

      const load = Effect.fnUntraced(function*(state: string) {
        yield* Schema.decodeEffect(Random)(state).pipe(Effect.mapError(() => Rejected.make({})))
        const id = yield* digest(state)
        const stored = yield* persistence.get(proxy, id)

        if (stored === undefined) return yield* Rejected.make({})

        const record = yield* snapshotRecord
          .effect(stored)
          .pipe(Effect.mapError(() => Unavailable.make({})))

        if (record.context.id !== id || record.context.proxy !== proxy) {
          return yield* Unavailable.make({})
        }
        if (record.context.expiresAtMillis <= (yield* now)) return yield* Rejected.make({})
        // Removing a registration immediately prevents both callback and redemption.
        if (
          !registered.some(
            (env) =>
              env.id === record.context.environment &&
              env.callbacks.some(
                (callback) =>
                  callback.provider === record.context.configuration.provider &&
                  callback.callbackId === record.context.configuration.callbackId &&
                  callback.redirectUri === record.context.configuration.redirectUri
              )
          )
        ) {
          return yield* Rejected.make({})
        }

        return record
      })

      const transition = Effect.fnUntraced(function*(previous: Record, next: Record) {
        const checked = yield* snapshotRecord
          .effect(next)
          .pipe(Effect.mapError(() => Unavailable.make({})))

        if (!(yield* persistence.compareAndSet(proxy, previous.version, checked))) {
          return yield* Rejected.make({})
        }
      })

      const begin = Effect.fnUntraced(function*(input: typeof Begin.Type, request: Request) {
        const env = yield* authorize(input.environment, request)

        if (
          !env.callbacks.some(
            (callback) =>
              callback.provider === input.provider &&
              callback.callbackId === input.callbackId &&
              callback.redirectUri === input.redirectUri
          )
        ) {
          return yield* Rejected.make({})
        }
        const entry = installed.find((entry) => entry.provider === input.provider)

        if (entry === undefined) return yield* Rejected.make({})

        const prepared = yield* entry.protocol
          .prepareAuthorization({
            provider: input.provider,
            flowId: input.flowId,
            ...(input.prompt === undefined ? {} : { prompt: input.prompt }),
            ...(input.loginHint === undefined ? {} : { loginHint: input.loginHint })
          })
          .pipe(
            Effect.flatMap((value) => snapshotOAuthProtocolPreparation.effect(value)),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
          )

        if (
          prepared.configuration.provider !== entry.provider ||
          prepared.configuration.callbackId !== entry.callbackId ||
          prepared.configuration.redirectUri !== entry.redirectUri
        ) {
          return yield* Unavailable.make({})
        }
        const state = Redacted.value(prepared.secrets.state)

        yield* Schema.decodeEffect(Random)(state).pipe(Effect.mapError(() => Unavailable.make({})))

        const configuration = {
          ...prepared.configuration,
          responseIssuerMode: "required" as const,
          callbackId: input.callbackId,
          redirectUri: OAuthRedirectUri.make(input.redirectUri)
        }

        const context = yield* Schema.decodeEffect(FlowContext)({
          id: yield* digest(state),
          proxy,
          environment: env.id,
          flowId: input.flowId,
          verifierDigest: input.verifierDigest,
          configuration,
          upstream: prepared.configuration,
          responseMode: prepared.responseMode ?? "query",
          expiresAtMillis: (yield* now) + 300_000
        }).pipe(Effect.mapError(() => Unavailable.make({})))

        const sealed = yield* protector.seal(context, { _tag: "Pending", preparation: prepared })

        if (
          !(yield* persistence.insert(proxy, {
            _tag: "Pending",
            version: yield* random,
            context,
            sealed
          }))
        ) {
          return yield* Rejected.make({})
        }

        return yield* Schema.encodeEffect(Prepared)({
          configuration,
          authorizationUrl: prepared.authorizationUrl,
          state: prepared.secrets.state,
          ...(prepared.secrets.oidcNonce === undefined
            ? {}
            : { oidcNonce: prepared.secrets.oidcNonce })
        })
      })

      const redeem = Effect.fnUntraced(function*(input: typeof Redeem.Type, request: Request) {
        yield* authorize(input.environment, request)
        const record = yield* load(Redacted.value(input.state))

        if (
          record._tag !== "Ready" ||
          record.context.environment !== input.environment ||
          !sameConfiguration(record.context.configuration, input.configuration) ||
          record.context.verifierDigest !== (yield* digest(Redacted.value(input.verifier))) ||
          record.codeDigest !== (yield* digest(Redacted.value(input.code))) ||
          record.handoffExpiresAtMillis <= (yield* now)
        ) {
          return yield* Rejected.make({})
        }
        const payload = yield* protector.open(record.context, record.sealed)

        if (payload._tag !== "Verified") return yield* Unavailable.make({})
        // Consume before delivering identity. A lost response requires new sign-in.
        yield* transition(record, {
          _tag: "Consumed",
          version: yield* random,
          context: record.context
        })

        return yield* Schema.encodeEffect(OAuthVerifiedExternalIdentity)(payload.identity)
      })

      const callback = Effect.fnUntraced(function*(provider: string, request: Request, url: URL) {
        const formPost = request.method === "POST"

        if (
          formPost &&
          (url.search !== "" ||
            request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
              "application/x-www-form-urlencoded")
        ) {
          return yield* Rejected.make({})
        }

        const params = formPost
          ? new URLSearchParams(yield* readText(HttpServerRequest.fromWeb(request).stream, 16384))
          : url.searchParams

        const known = new Set([
          "code",
          "state",
          "iss",
          "error",
          "error_description",
          "error_uri",
          "scope",
          "authuser",
          "prompt",
          ...(formPost ? ["user"] : [])
        ])

        const seen = new Set<string>()

        for (const [key, value] of params) {
          if (!known.has(key) || seen.has(key) || value.length > 4096) {
            return yield* Rejected.make({})
          }
          seen.add(key)
        }
        const state = params.get("state")
        const code = params.get("code")
        const error = params.get("error")

        if (state === null || (code === null) === (error === null)) return yield* Rejected.make({})
        const record = yield* load(state)
        const context = record.context
        const issuer = params.get("iss")

        if (
          record._tag !== "Pending" ||
          context.upstream.provider !== provider ||
          context.responseMode !== (formPost ? "form_post" : "query") ||
          (context.upstream.responseIssuerMode === "required"
            ? issuer !== context.upstream.issuer
            : issuer !== null)
        ) {
          return yield* Rejected.make({})
        }
        const payload = yield* protector.open(context, record.sealed)

        if (
          payload._tag !== "Pending" ||
          Redacted.value(payload.preparation.secrets.state) !== state ||
          !sameConfiguration(payload.preparation.configuration, context.upstream)
        ) {
          return yield* Unavailable.make({})
        }
        const scope = params.get("scope")
        const user = params.get("user")

        const response = yield* Schema.decodeEffect(OAuthCallbackResponse)(
          code === null
            ? {
              _tag: "Error",
              state,
              error: error === "access_denied" ? "access-denied" : "rejected",
              ...(issuer === null ? {} : { issuer })
            }
            : {
              _tag: "Code",
              state,
              code,
              ...(issuer === null ? {} : { issuer }),
              ...(scope === null ? {} : { scope }),
              ...(user === null || user.length === 0 ? {} : { user })
            }
        ).pipe(Effect.mapError(() => Rejected.make({})))

        const exchanging: Record = { _tag: "Exchanging", version: yield* random, context }

        // No reset or lease takeover. Even interruption after CAS cannot re-exchange.
        yield* transition(record, exchanging)
        const destination = new URL(context.configuration.redirectUri)

        destination.searchParams.set("state", state)
        destination.searchParams.set("iss", context.configuration.issuer)
        if (response._tag === "Error") {
          destination.searchParams.set(
            "error",
            error === "access_denied" ? "access_denied" : "rejected"
          )
        } else {
          const entry = installed.find((entry) => entry.provider === provider)

          if (entry === undefined) return yield* Rejected.make({})
          const started = yield* DateTime.now

          const identity = yield* entry.protocol
            .exchangeVerifiedIdentity({
              configuration: context.upstream,
              secrets: payload.preparation.secrets,
              response,
              verificationStartedAt: started
            })
            .pipe(
              timeoutWithCause(30_000),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({})))),
              Effect.flatMap((value) => snapshotOAuthVerifiedExternalIdentity.effect(value)),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
            )

          if (
            identity.identity.provider !== provider ||
            identity.identity.issuer !== context.upstream.issuer
          ) {
            return yield* Unavailable.make({})
          }
          const handoff = yield* random

          const sealed = yield* protector.seal(context, {
            _tag: "Verified",
            identity: {
              ...identity,
              upstreamAuthenticatedAt: identity.upstreamAuthenticatedAt ?? started
            }
          })

          yield* transition(exchanging, {
            _tag: "Ready",
            version: yield* random,
            context,
            sealed,
            codeDigest: yield* digest(handoff),
            handoffExpiresAtMillis: Math.min(context.expiresAtMillis, (yield* now) + 60_000)
          })
          destination.searchParams.set("code", handoff)
        }

        return new Response(null, {
          status: 303,
          headers: { ...noStore, location: destination.href }
        })
      })

      const handle = Effect.fnUntraced(
        function*(request: Request) {
          if (request.url.length > 16384) return yield* Rejected.make({})

          const url = yield* Effect.try({
            try: () => new URL(request.url),
            catch: () => Rejected.make({})
          })

          if (url.origin !== origin) return yield* Rejected.make({})

          const entry = installed.find(
            (entry) => url.pathname === `${path}/${entry.provider}/callback`
          )

          if (entry !== undefined && (request.method === "GET" || request.method === "POST")) {
            return yield* callback(entry.provider, request, url)
          }
          if (
            request.method !== "POST" ||
            url.search !== "" ||
            ![`${path}/prepare`, `${path}/redeem`].includes(url.pathname) ||
            request.headers.get("content-type")?.split(";")[0] !== "application/json"
          ) {
            return yield* Rejected.make({})
          }
          const body = yield* readText(HttpServerRequest.fromWeb(request).stream, 16384)

          const result = url.pathname.endsWith("/prepare")
            ? yield* Schema.decodeEffect(Schema.fromJsonString(Begin))(body).pipe(
              Effect.flatMap((input) => begin(input, request))
            )
            : yield* Schema.decodeEffect(Schema.fromJsonString(Redeem))(body).pipe(
              Effect.flatMap((input) => redeem(input, request))
            )

          return Response.json(result, { headers: noStore })
        },
        timeoutWithCause(40_000),
        Effect.catchCause((cause) =>
          Effect.gen(function*() {
            const unexpected = Cause.fromReasons(
              cause.reasons.filter(
                (reason) =>
                  Cause.isDieReason(reason) ||
                  (Cause.isFailReason(reason) &&
                    reason.error._tag !== "OAuthProxyRejected" &&
                    reason.error._tag !== "SchemaError")
              )
            )

            yield* reportAuthFailure("http", unexpected)
            if (Cause.hasInterrupts(cause)) {
              return yield* Effect.failCause(
                Cause.fromReasons<never>([
                  ...cause.reasons.filter(Cause.isInterruptReason),
                  ...(unexpected.reasons.length === 0
                    ? []
                    : [Cause.makeDieReason(ReportedOperationDefect.make({}))])
                ])
              )
            }

            const rejected = unexpected.reasons.length === 0

            return Response.json(
              { error: rejected ? "rejected" : "unavailable" },
              {
                status: rejected ? 400 : 503,
                headers: noStore
              }
            )
          })
        )
      )

      return Server.of({
        paths: [
          `${path}/prepare`,
          `${path}/redeem`,
          ...installed.map((entry): `/${string}` => `${path}/${entry.provider}/callback`)
        ],
        handle
      })
    })
  )
}

export const routes = Layer.unwrap(
  Effect.gen(function*() {
    const server = yield* Server

    const handler = Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      let web = yield* HttpServerRequest.toWeb(request)

      // Bun retains its native HTTP source behind TLS termination. Reconstruct
      // the trusted edge's URL without bypassing the server's exact-origin check.
      if (request.headers["x-forwarded-proto"] === "https") {
        const url = HttpServerRequest.toURL(request)

        if (Option.isNone(url)) return HttpServerResponse.empty({ status: 400, headers: noStore })
        web = new Request(url.value, web)
      }

      return HttpServerResponse.fromWeb(yield* server.handle(web))
    })

    return Layer.mergeAll(
      Layer.empty,
      ...server.paths.map((path) => HttpRouter.add("*", path, handler))
    )
  })
)

const snapshotRecord = makeOAuthSnapshot(Record)
const snapshotOAuthProtocolPreparation = makeOAuthSnapshot(OAuthProtocolPreparation)
const snapshotOAuthVerifiedExternalIdentity = makeOAuthSnapshot(OAuthVerifiedExternalIdentity)

const snapshotEnvironments = makeOAuthSnapshot(Schema.Array(Environment))
