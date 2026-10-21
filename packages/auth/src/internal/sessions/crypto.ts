import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { native } from "../crypto.ts"
import { makeSigningKey } from "../shared/signingKey.ts"

import { TokenDigest } from "../../Schema.ts"
import { AuthConfig } from "../auth/authConfig.ts"
import { defaultLayer } from "../auth/defaults.ts"
import { markAuthFailureReported, reportAuthFailure, withoutObservability } from "../shared/diagnostics.ts"
import { SessionConfigurationError, SessionInvalid, SessionUnavailable } from "./errors.ts"

export interface SessionSigningKeyring {
  readonly activeKeyId: string
  /** At least 32 cryptographically random bytes per key, encoded as base64url. */
  readonly keys: ReadonlyArray<{
    readonly id: string
    readonly material: Redacted.Redacted<string>
  }>
}

/** Override the application-secret default to manage signing-key IDs and rotation. */
export class SessionSigningKeys extends Context.Service<
  SessionSigningKeys,
  SessionSigningKeyring
>()("@effect/auth/sessions/SessionSigningKeys") {
  static readonly layer = Layer.effect(
    SessionSigningKeys,
    Effect.map(AuthConfig, ({ secret }) => ({
      activeKeyId: "default",
      keys: [{ id: "default", material: Redacted.make(Base64Url.encode(Redacted.value(secret))) }]
    }))
  )
}

/** @internal */
export const sessionSigningKeysLayer = defaultLayer(
  SessionSigningKeys,
  SessionSigningKeys.layer.pipe(Layer.provide(defaultLayer(AuthConfig, AuthConfig.layer())))
)

const opaqueCredential = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
const keyIdSchema = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/))

const Keyring = Schema.Struct({
  activeKeyId: keyIdSchema,
  keys: Schema.Array(
    Schema.Struct({ id: keyIdSchema, material: Schema.Redacted(Schema.String) })
  ).check(Schema.isMinLength(1))
})

const textEncoder = new TextEncoder()

const digestMessage = Schema.fromJsonString(
  Schema.Struct({
    namespace: Schema.Literal("effect-auth/session"),
    moduleId: Schema.String,
    purpose: Schema.Literals(["bearer", "pending", "step-up", "step-up-binding"]),
    secret: Schema.String
  })
)

/** Observe backend failures once before translating them into the finite session port. */
const sessionDiagnostics = (stage: "session-crypto" | "session-cache") => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catchCause((cause) =>
      reportAuthFailure(stage, cause).pipe(
        Effect.andThen(Effect.failCause(markAuthFailureReported(cause)))
      )
    )
  )

export const makeSessionSecrets = Effect.fnUntraced(function*(moduleId: string) {
  const random = yield* SecureRandom.SecureRandom
  const digestService = yield* Digest.Digest

  return {
    generate: Effect.fnUntraced(function*() {
      const bytes = yield* random.randomBytes(32).pipe(
        Effect.catchDefect(() => Effect.fail(SessionUnavailable.make({}))),
        sessionDiagnostics("session-crypto"),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
      )

      return Redacted.make(Base64Url.encode(bytes))
    }),
    digest: Effect.fnUntraced(function*(
      token: Redacted.Redacted<string>,
      purpose: "bearer" | "pending" | "step-up" | "step-up-binding"
    ) {
      yield* Schema.decodeEffect(opaqueCredential)(Redacted.value(token)).pipe(
        Effect.mapError(() => SessionInvalid.make({}))
      )

      const message = yield* Schema.encodeEffect(digestMessage)({
        namespace: "effect-auth/session",
        moduleId,
        purpose,
        secret: Redacted.value(token)
      }).pipe(Effect.orDie)

      const digest = yield* digestService.digest(Digest.sha256, textEncoder.encode(message)).pipe(
        Effect.catchDefect(() => Effect.fail(SessionUnavailable.make({}))),
        sessionDiagnostics("session-crypto"),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
      )

      return TokenDigest.make(Base64Url.encode(digest))
    })
  }
})

/** Scoped key snapshot: retirement is effective only after every runtime installs it. */
export const makeSessionSigningCodec = Effect.fnUntraced(function*<
  S extends Schema.Top
>(
  schema: S,
  configuration: SessionSigningKeyring,
  maximumTokenBytes: number,
  purpose: "session" | "session-cache" = "session"
) {
  const checked = yield* Schema.decodeEffect(Keyring)(configuration).pipe(
    Effect.mapError(() => SessionConfigurationError.make({ reason: "keyring" }))
  )

  const mac = yield* Mac.Mac

  const services = (yield* Effect.context<S["DecodingServices"] | S["EncodingServices"]>()).pipe(
    withoutObservability
  )

  const keys = new Map<string, Effect.Success<ReturnType<typeof makeSigningKey>>>()

  const version = purpose === "session-cache" ? "eac1" : "eas1"

  const tokenFormat = Schema.String.check(
    Schema.isPattern(
      purpose === "session-cache"
        ? /^eac1\.[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
        : /^eas1\.[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
    )
  )

  const importKey = (material: Uint8Array) =>
    makeSigningKey(native(Mac.key(Mac.hmacSha256, material))).pipe(
      sessionDiagnostics("session-crypto"),
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, () => SessionConfigurationError.make({ reason: "keyring" }))
        )
      ),
      Effect.ensuring(Effect.sync(() => material.fill(0)))
    )

  for (const entry of checked.keys) {
    yield* Schema.decodeEffect(keyIdSchema)(entry.id).pipe(
      Effect.mapError(() => SessionConfigurationError.make({ reason: "keyring" }))
    )

    const material = Result.getOrUndefined(Base64Url.decode(Redacted.value(entry.material)))

    if (keys.has(entry.id) || material === undefined || material.length < 32) {
      return yield* SessionConfigurationError.make({ reason: "keyring" })
    }

    const root = yield* importKey(material)

    const key = purpose === "session-cache"
      ? yield* root((key) => native(mac.sign(key, textEncoder.encode("effect-auth/session-cache/key/v1")))).pipe(
        sessionDiagnostics("session-crypto"),
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, () => SessionConfigurationError.make({ reason: "keyring" }))
          )
        ),
        Effect.flatMap(importKey)
      )
      : root

    keys.set(entry.id, key)
  }
  const activeKeyId = checked.activeKeyId
  const activeKey = keys.get(activeKeyId)

  if (activeKey === undefined) return yield* SessionConfigurationError.make({ reason: "keyring" })
  const codec = Schema.fromJsonString(Schema.toCodecJson(schema))
  const encode = Schema.encodeEffect(codec)
  const decode = Schema.decodeEffect(codec)

  return {
    encode: Effect.fnUntraced(function*(claims: S["Type"]) {
      const json = yield* encode(claims).pipe(
        Effect.provide(services),
        sessionDiagnostics(purpose === "session-cache" ? "session-cache" : "session-crypto"),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
      )

      const message = `${version}.${activeKeyId}.${Base64Url.encode(json)}`

      const signature = yield* activeKey((key) => native(mac.sign(key, textEncoder.encode(message)))).pipe(
        sessionDiagnostics("session-crypto"),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
      )

      const token = `${message}.${Base64Url.encode(signature)}`

      if (token.length > maximumTokenBytes) {
        return yield* SessionUnavailable.make({}).pipe(
          sessionDiagnostics(purpose === "session-cache" ? "session-cache" : "session-crypto")
        )
      }

      return Redacted.make(token)
    }),
    decode: Effect.fnUntraced(function*(
      credential: Redacted.Redacted<string>
    ) {
      const token = Redacted.value(credential)

      if (token.length > maximumTokenBytes) return yield* SessionInvalid.make({})
      yield* Schema.decodeEffect(tokenFormat)(token).pipe(
        Effect.mapError(() => SessionInvalid.make({}))
      )
      const [version, keyId, payload, signatureText] = token.split(".")
      const key = keys.get(keyId)
      const signature = Result.getOrUndefined(Base64Url.decode(signatureText))

      if (key === undefined || signature === undefined || signature.length !== 32) {
        return yield* SessionInvalid.make({})
      }

      const valid = yield* key((key) =>
        native(mac.verify(key, signature, textEncoder.encode(`${version}.${keyId}.${payload}`)))
      ).pipe(
        sessionDiagnostics("session-crypto"),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
      )

      if (!valid) return yield* SessionInvalid.make({})
      const json = Result.getOrUndefined(Base64Url.decodeString(payload))

      if (json === undefined) return yield* SessionInvalid.make({})

      return yield* decode(json).pipe(
        Effect.provide(services),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionInvalid.make({}))))
      )
    })
  }
})
