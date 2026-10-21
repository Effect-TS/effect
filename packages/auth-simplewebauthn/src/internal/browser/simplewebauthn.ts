import {
  PasskeyAuthenticationStarted,
  PasskeyProtocolCredentialId,
  PasskeyRegistrationStarted,
  snapshotPasskey
} from "@effect/auth/Passkey"
import { markAuthFailureReported, reportAuthFailure } from "@effect/auth/Persistence"
import {
  base64URLStringToBuffer,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  bufferToBase64URLString,
  platformAuthenticatorIsAvailable
} from "@simplewebauthn/browser"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import {
  PasskeyBrowserAuthentication,
  PasskeyBrowserBusy,
  PasskeyBrowserCapabilities,
  type PasskeyBrowserFailure,
  PasskeyBrowserInputRejected,
  PasskeyBrowserNotCompleted,
  PasskeyBrowserRegistration,
  PasskeyBrowserUnavailable,
  PasskeyBrowserUnsupported
} from "./models.ts"
import { PasskeyBrowser } from "./passkeyBrowser.ts"

type Browser = PasskeyBrowser["Service"]
const unavailable = () => PasskeyBrowserUnavailable.make({})
const rejected = () => PasskeyBrowserInputRejected.make({})
const incomplete = () => PasskeyBrowserNotCompleted.make({})

const unexpected = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.uninterruptibleMask((restore) =>
    restore(effect).pipe(
      Effect.catchCause((cause) => {
        const reasons = cause.reasons.filter(
          (reason) =>
            Cause.isDieReason(reason) ||
            (Cause.isFailReason(reason) && Schema.is(PasskeyBrowserUnavailable)(reason.error))
        )

        if (reasons.length === 0) return Effect.failCause(cause)

        return reportAuthFailure("passkey-browser", Cause.fromReasons(reasons)).pipe(
          Effect.andThen(
            Effect.failCause(
              markAuthFailureReported(
                Cause.fromReasons<E | PasskeyBrowserUnavailable>(
                  cause.reasons.map((reason) =>
                    Cause.isDieReason(reason) ? Cause.makeFailReason(unavailable()) : reason
                  )
                )
              )
            )
          )
        )
      })
    )
  )

const decode = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  value: unknown
) =>
  // Native browser objects and maintained capability helpers are untyped boundaries.
  // eslint-disable-next-line no-restricted-properties
  Schema.decodeUnknownEffect(schema)(value).pipe(Effect.mapError(unavailable))

const capture = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  value: S["Type"]
) => snapshotPasskey(schema, value).pipe(Effect.mapError(rejected))

const timeout = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 300000 }))

const registrationInput = Schema.Struct({
  ...PasskeyRegistrationStarted.fields,
  options: Schema.Struct({ ...PasskeyRegistrationStarted.fields.options.fields, timeout })
})

const authenticationInput = Schema.Struct({
  started: Schema.Struct({
    ...PasskeyAuthenticationStarted.fields,
    options: Schema.Struct({ ...PasskeyAuthenticationStarted.fields.options.fields, timeout })
  }),
  mediation: Schema.Literals(["required", "conditional"])
})

const nativeCapabilities = Schema.Struct({
  conditionalGet: Schema.UndefinedOr(Schema.Boolean),
  userVerifyingPlatformAuthenticator: Schema.UndefinedOr(Schema.Boolean),
  hybridTransport: Schema.UndefinedOr(Schema.Boolean),
  passkeyPlatformAuthenticator: Schema.UndefinedOr(Schema.Boolean)
})

const support = (value: boolean | undefined) =>
  value === undefined
    ? ("unknown" as const)
    : value
    ? ("supported" as const)
    : ("unsupported" as const)

const readCapabilities = Effect.gen(function*() {
  if (!Predicate.isFunction(globalThis.PublicKeyCredential.getClientCapabilities)) {
    return {
      conditionalGet: undefined,
      userVerifyingPlatformAuthenticator: undefined,
      hybridTransport: undefined,
      passkeyPlatformAuthenticator: undefined
    }
  }
  const raw = yield* Effect.promise(() => globalThis.PublicKeyCredential.getClientCapabilities())

  const fields = yield* Effect.suspend(() => {
    try {
      if (!Predicate.isObject(raw)) return Effect.fail(unavailable())

      return Effect.succeed({
        conditionalGet: raw.conditionalGet,
        userVerifyingPlatformAuthenticator: raw.userVerifyingPlatformAuthenticator,
        hybridTransport: raw.hybridTransport,
        passkeyPlatformAuthenticator: raw.passkeyPlatformAuthenticator
      })
    } catch (error) {
      return Effect.die(error)
    }
  })

  return yield* decode(nativeCapabilities, fields)
})

const booleanCapability = Effect.fn("passkeyBrowserBooleanCapability")(function*(
  call: () => PromiseLike<boolean>
) {
  const value = yield* decode(Schema.Boolean, yield* Effect.promise(call))

  return value ? ("supported" as const) : ("unsupported" as const)
})

const environment = Effect.sync(() => {
  const secureContext = globalThis.isSecureContext === true
  const container = globalThis.navigator?.credentials

  const webAuthn = secureContext &&
    browserSupportsWebAuthn() &&
    container !== undefined &&
    Predicate.isFunction(container.get) &&
    Predicate.isFunction(container.create) &&
    Predicate.isFunction(globalThis.AbortController)

  return { secureContext, webAuthn, container }
})

const capabilities = Effect.gen(function*() {
  const env = yield* environment

  if (!env.webAuthn) {
    return yield* snapshotPasskey(PasskeyBrowserCapabilities, {
      secureContext: env.secureContext,
      webAuthn: false,
      conditionalGet: "unsupported",
      userVerifyingPlatformAuthenticator: "unsupported",
      hybridTransport: "unsupported",
      passkeyPlatformAuthenticator: "unsupported"
    }).pipe(Effect.mapError(unavailable))
  }
  const raw = yield* readCapabilities

  const values = {
    conditionalGet: support(raw.conditionalGet),
    userVerifyingPlatformAuthenticator: support(raw.userVerifyingPlatformAuthenticator),
    hybridTransport: support(raw.hybridTransport),
    passkeyPlatformAuthenticator: support(raw.passkeyPlatformAuthenticator)
  }

  const conditionalGet = values.conditionalGet === "unknown"
    ? Predicate.isFunction(globalThis.PublicKeyCredential.isConditionalMediationAvailable)
      ? yield* booleanCapability(browserSupportsWebAuthnAutofill)
      : ("unsupported" as const)
    : values.conditionalGet

  const platform = values.userVerifyingPlatformAuthenticator === "unknown" &&
      Predicate.isFunction(globalThis.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
    ? yield* booleanCapability(platformAuthenticatorIsAvailable)
    : values.userVerifyingPlatformAuthenticator

  return yield* snapshotPasskey(PasskeyBrowserCapabilities, {
    secureContext: env.secureContext,
    webAuthn: true,
    ...values,
    conditionalGet,
    userVerifyingPlatformAuthenticator: platform
  }).pipe(Effect.mapError(unavailable))
}).pipe(
  Effect.timeoutOrElse({ duration: 5000, orElse: () => Effect.fail(unavailable()) }),
  unexpected
)

interface Lease {
  readonly container: CredentialsContainer
  readonly controller: AbortController
  phase: "pre-native" | "native" | "settled"
}
// One installed module coordinates its instances. No third-party/global cancel.
const leases = new WeakMap<CredentialsContainer, Lease>()

const settle = (lease: Lease): void => {
  lease.phase = "settled"
  if (leases.get(lease.container) === lease) leases.delete(lease.container)
}

const acquire = Effect.gen(function*() {
  const env = yield* environment

  if (!env.webAuthn || env.container === undefined) {
    return yield* PasskeyBrowserUnsupported.make({})
  }
  if (leases.has(env.container)) return yield* PasskeyBrowserBusy.make({})

  const lease: Lease = {
    container: env.container,
    controller: new AbortController(),
    phase: "pre-native"
  }

  leases.set(env.container, lease)

  return lease
})

const release = (lease: Lease) =>
  Effect.sync(() => {
    if (lease.phase === "settled") return
    // Abort requests cancellation; only raw native settlement releases a started call.
    try {
      lease.controller.abort()
    } finally {
      if (lease.phase === "pre-native") settle(lease)
    }
  })

const nativeFailure = (value: unknown): Effect.Effect<never, PasskeyBrowserNotCompleted> => {
  try {
    if (!Predicate.isObject(value)) return Effect.die(value)
    // Only the native error's standardized name is inspected; no message or cause.
    // eslint-disable-next-line no-restricted-properties
    const parsed = Schema.decodeUnknownOption(Schema.String)(value.name)

    if (
      parsed._tag === "Some" &&
      [
        "NotAllowedError",
        "InvalidStateError",
        "ConstraintError",
        "NotSupportedError",
        "SecurityError",
        "AbortError"
      ].includes(parsed.value)
    ) {
      return Effect.fail(incomplete())
    }
  } catch (error) {
    return Effect.failCause(
      Cause.fromReasons([Cause.makeDieReason(value), Cause.makeDieReason(error)])
    )
  }

  return Effect.die(value)
}

type NativeRequest =
  | {
    readonly _tag: "Create"
    readonly publicKey: PublicKeyCredentialCreationOptions
  }
  | {
    readonly _tag: "Get"
    readonly publicKey: PublicKeyCredentialRequestOptions
    readonly mediation: "required" | "conditional"
  }

const native = (lease: Lease, request: NativeRequest) =>
  Effect.callback<unknown, PasskeyBrowserNotCompleted | PasskeyBrowserUnavailable>(
    (resume, signal) => {
      if (
        signal.aborted ||
        lease.controller.signal.aborted ||
        lease.phase !== "pre-native" ||
        leases.get(lease.container) !== lease
      ) {
        resume(Effect.fail(incomplete()))

        return
      }
      lease.phase = "native"
      try {
        const promise = request._tag === "Create"
          ? lease.container.create({
            publicKey: request.publicKey,
            signal: lease.controller.signal
          })
          : lease.container.get({
            publicKey: request.publicKey,
            mediation: request.mediation,
            signal: lease.controller.signal
          })

        // Both handlers always settle and never throw, including after interruption.
        void Promise.resolve(promise).then(
          (value) => {
            try {
              settle(lease)
              if (!signal.aborted && !lease.controller.signal.aborted) {
                resume(Effect.succeed(value))
              }
            } catch {
              /* Detached handlers cannot reject. */
            }
          },
          (error) => {
            try {
              settle(lease)
              if (!signal.aborted && !lease.controller.signal.aborted) resume(nativeFailure(error))
            } catch {
              /* Detached handlers cannot reject. */
            }
          }
        )
      } catch (error) {
        settle(lease)
        resume(nativeFailure(error))
      }
    }
  )

const remaining = Effect.fn("passkeyBrowserRemaining")(function*(deadline: number) {
  const duration = deadline - DateTime.toEpochMillis(yield* DateTime.now)

  if (duration <= 0) return yield* incomplete()

  return Math.max(1, Math.floor(duration))
})

const runCeremony = Effect.fn("passkeyBrowserRunCeremony")(function*<A>(
  started: { readonly expiresAtMillis: number; readonly options: { readonly timeout: number } },
  use: (lease: Lease, deadline: number) => Effect.Effect<A, PasskeyBrowserFailure>
) {
  const now = DateTime.toEpochMillis(yield* DateTime.now)

  if (started.expiresAtMillis <= now) return yield* rejected()
  const deadline = Math.min(started.expiresAtMillis, now + started.options.timeout)

  return yield* Effect.acquireUseRelease(
    acquire,
    (lease) =>
      Effect.gen(function*() {
        const duration = yield* remaining(deadline)

        return yield* use(lease, deadline).pipe(
          Effect.timeoutOrElse({ duration, orElse: () => Effect.fail(incomplete()) })
        )
      }),
    release
  )
})

const nativeEnvelope = {
  id: PasskeyProtocolCredentialId,
  rawId: Schema.instanceOf(ArrayBuffer),
  type: Schema.Literal("public-key")
}

const nativeRegistration = Schema.Struct({
  ...nativeEnvelope,
  response: Schema.Struct({
    attestationObject: Schema.instanceOf(ArrayBuffer),
    clientDataJSON: Schema.instanceOf(ArrayBuffer)
  })
})

const nativeAuthentication = Schema.Struct({
  ...nativeEnvelope,
  response: Schema.Struct({
    authenticatorData: Schema.instanceOf(ArrayBuffer),
    clientDataJSON: Schema.instanceOf(ArrayBuffer),
    signature: Schema.instanceOf(ArrayBuffer),
    userHandle: Schema.optionalKey(Schema.NullOr(Schema.instanceOf(ArrayBuffer)))
  })
})

const buffer = Effect.fn("passkeyBrowserBuffer")(function*(
  value: ArrayBuffer,
  minimum: number,
  maximum: number
) {
  // Slice with an upper bound before conversion, ignoring instance overrides.
  const copied = yield* Effect.sync(() => ArrayBuffer.prototype.slice.call(value, 0, maximum + 1))

  if (copied.byteLength < minimum || copied.byteLength > maximum) return yield* unavailable()

  return yield* Effect.sync(() => bufferToBase64URLString(copied))
})

const registrationWire = Schema.fromJsonString(
  Schema.Struct({
    id: Schema.String,
    rawId: Schema.String,
    type: Schema.Literal("public-key"),
    response: Schema.Struct({ attestationObject: Schema.String, clientDataJSON: Schema.String }),
    clientExtensionResults: Schema.Struct({})
  })
)

const authenticationWire = Schema.fromJsonString(
  Schema.Struct({
    id: Schema.String,
    rawId: Schema.String,
    type: Schema.Literal("public-key"),
    response: Schema.Struct({
      authenticatorData: Schema.String,
      clientDataJSON: Schema.String,
      signature: Schema.String,
      userHandle: Schema.optionalKey(Schema.String)
    }),
    clientExtensionResults: Schema.Struct({})
  })
)

const registrationResponse = Effect.fn("passkeyBrowserRegistrationResponse")(function*(
  value: unknown
) {
  if (value === null) return yield* incomplete()

  const fields = yield* Effect.suspend(() => {
    try {
      if (!Predicate.isObject(value)) return Effect.fail(unavailable())
      const response = value.response

      if (!Predicate.isObject(response)) return Effect.fail(unavailable())

      return Effect.succeed({
        id: value.id,
        rawId: value.rawId,
        type: value.type,
        response: {
          attestationObject: response.attestationObject,
          clientDataJSON: response.clientDataJSON
        }
      })
    } catch (error) {
      return Effect.die(error)
    }
  })

  const credential = yield* decode(nativeRegistration, fields)
  const rawId = yield* buffer(credential.rawId, 1, 1023)

  if (credential.id !== rawId) return yield* unavailable()

  return yield* Schema.encodeEffect(registrationWire)({
    id: credential.id,
    rawId,
    type: "public-key",
    response: {
      attestationObject: yield* buffer(credential.response.attestationObject, 1, 65536),
      clientDataJSON: yield* buffer(credential.response.clientDataJSON, 1, 8192)
    },
    clientExtensionResults: {}
  }).pipe(Effect.mapError(unavailable))
})

const authenticationResponse = Effect.fn("passkeyBrowserAuthenticationResponse")(function*(
  value: unknown
) {
  if (value === null) return yield* incomplete()

  const fields = yield* Effect.suspend(() => {
    try {
      if (!Predicate.isObject(value)) return Effect.fail(unavailable())
      const response = value.response

      if (!Predicate.isObject(response)) return Effect.fail(unavailable())
      const userHandle = response.userHandle

      return Effect.succeed({
        id: value.id,
        rawId: value.rawId,
        type: value.type,
        response: {
          authenticatorData: response.authenticatorData,
          clientDataJSON: response.clientDataJSON,
          signature: response.signature,
          ...(userHandle === undefined ? {} : { userHandle })
        }
      })
    } catch (error) {
      return Effect.die(error)
    }
  })

  const credential = yield* decode(nativeAuthentication, fields)
  const rawId = yield* buffer(credential.rawId, 1, 1023)

  if (credential.id !== rawId) return yield* unavailable()
  const handle = credential.response.userHandle

  return yield* Schema.encodeEffect(authenticationWire)({
    id: credential.id,
    rawId,
    type: "public-key",
    response: {
      authenticatorData: yield* buffer(credential.response.authenticatorData, 37, 16384),
      clientDataJSON: yield* buffer(credential.response.clientDataJSON, 1, 8192),
      signature: yield* buffer(credential.response.signature, 1, 1024),
      ...(handle === null || handle === undefined
        ? {}
        : { userHandle: yield* buffer(handle, 1, 64) })
    },
    clientExtensionResults: {}
  }).pipe(Effect.mapError(unavailable))
})

const conditional = Effect.gen(function*() {
  if (!Predicate.isFunction(globalThis.PublicKeyCredential.isConditionalMediationAvailable)) {
    return yield* PasskeyBrowserUnsupported.make({})
  }
  if ((yield* booleanCapability(browserSupportsWebAuthnAutofill)) !== "supported") {
    return yield* PasskeyBrowserUnsupported.make({})
  }

  const present = yield* Effect.sync(() =>
    Array.from(globalThis.document.querySelectorAll("input[autocomplete]")).some(
      (input) =>
        input
          .getAttribute("autocomplete")
          ?.split(/[\t\n\f\r ]+/)
          // Keep HTML autocomplete tokens in order and inspect the final nonempty token.
          // eslint-disable-next-line unicorn/prefer-array-find
          .filter((token) => token.length > 0)
          .at(-1)
          ?.toLowerCase() === "webauthn"
    )
  )

  if (!present) return yield* rejected()
}).pipe(Effect.timeoutOrElse({ duration: 5000, orElse: () => Effect.fail(unavailable()) }))

/**
 * Creates a browser passkey adapter without starting a ceremony.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeSimpleWebAuthnPasskeyBrowser = Effect.fn("makeSimpleWebAuthnPasskeyBrowser")(
  (): Effect.Effect<Browser> =>
    Effect.sync(() => {
      const register = Effect.fn("PasskeyBrowser.register")(function*(
        input: Parameters<Browser["register"]>[0]
      ) {
        const started = yield* capture(registrationInput, input)

        return yield* runCeremony(started, (lease, deadline) =>
          Effect.gen(function*() {
            const timeoutMillis = yield* remaining(deadline)
            const options = started.options

            const publicKey: PublicKeyCredentialCreationOptions = {
              challenge: base64URLStringToBuffer(options.challenge),
              rp: { ...options.rp },
              user: { ...options.user, id: base64URLStringToBuffer(options.user.id) },
              pubKeyCredParams: options.pubKeyCredParams.map((value) => ({ ...value })),
              timeout: timeoutMillis,
              attestation: options.attestation,
              authenticatorSelection: { ...options.authenticatorSelection },
              excludeCredentials: options.excludeCredentials.map((value) => ({
                type: value.type,
                id: base64URLStringToBuffer(value.id)
              }))
            }

            yield* remaining(deadline)

            const response = yield* registrationResponse(
              yield* native(lease, { _tag: "Create", publicKey })
            )

            yield* remaining(deadline)

            return yield* snapshotPasskey(PasskeyBrowserRegistration, {
              flowId: started.flowId,
              response: Redacted.make(response)
            }).pipe(Effect.mapError(unavailable))
          }))
      }, unexpected)

      const authenticate = Effect.fn("PasskeyBrowser.authenticate")(function*(
        input: Parameters<Browser["authenticate"]>[0]
      ) {
        const fixed = yield* capture(authenticationInput, input)
        const { started, mediation } = fixed

        if (mediation === "conditional" && started.options.allowCredentials.length !== 0) {
          return yield* rejected()
        }

        return yield* runCeremony(started, (lease, deadline) =>
          Effect.gen(function*() {
            if (mediation === "conditional") yield* conditional
            const timeoutMillis = yield* remaining(deadline)
            const options = started.options

            const publicKey: PublicKeyCredentialRequestOptions = {
              challenge: base64URLStringToBuffer(options.challenge),
              rpId: options.rpId,
              userVerification: options.userVerification,
              timeout: timeoutMillis,
              allowCredentials: options.allowCredentials.map((value) => ({
                type: value.type,
                id: base64URLStringToBuffer(value.id)
              }))
            }

            yield* remaining(deadline)

            const response = yield* authenticationResponse(
              yield* native(lease, { _tag: "Get", publicKey, mediation })
            )

            yield* remaining(deadline)

            return yield* snapshotPasskey(PasskeyBrowserAuthentication, {
              flowId: started.flowId,
              response: Redacted.make(response)
            }).pipe(Effect.mapError(unavailable))
          }))
      }, unexpected)

      return PasskeyBrowser.of({ capabilities, register, authenticate })
    })
)

/**
 * Layer that provides browser passkey ceremonies.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerSimpleWebAuthnPasskeyBrowser: Layer.Layer<PasskeyBrowser> = Layer.effect(
  PasskeyBrowser,
  makeSimpleWebAuthnPasskeyBrowser()
)
