import * as Cause from "effect/Cause"
import * as Aead from "effect/crypto/Aead"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import { native, withSecret } from "../../crypto.ts"

import { makeScopedOperation } from "../../shared/scopedOperation.ts"
import { OAuthConfigurationError, OAuthUnavailable } from "../signInErrors.ts"
import { OAuthEncryptionKeyId } from "../signInModels.ts"
import { makeOAuthSnapshot } from "../signInSnapshot.ts"
import type { OAuthTransactionKeyring } from "../transactionKeyring.ts"

const keyringSchema = Schema.Struct({
  activeKeyId: OAuthEncryptionKeyId,
  keys: Schema.Array(
    Schema.Struct({
      id: OAuthEncryptionKeyId,
      material: Schema.Redacted(Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)))
    })
  ).check(Schema.isMinLength(1), Schema.isMaxLength(8))
})

const encoder = new TextEncoder()
const fail = () => OAuthUnavailable.make({})

/** Ownership starts when acquisition returns; cancellation stays available while waiting. */
const ownBytes = <E, R>(acquire: Effect.Effect<Uint8Array, E, R>) =>
  Effect.acquireRelease(acquire, (bytes) => Effect.sync(() => bytes.fill(0)), {
    interruptible: true
  })

const unwrap = <A>(value: Redacted.Redacted<A>) => Effect.try({ try: () => Redacted.value(value), catch: fail })

/** @internal */
export const encodeUtf8 = Effect.fnUntraced(function*(value: string, maximum: number) {
  if (value.length > maximum) return yield* fail()
  const bytes = yield* ownBytes(Effect.sync(() => encoder.encode(value)))

  if (bytes.length > maximum) return yield* fail()

  return bytes
})

/** @internal */
export const decodeBase64 = Effect.fnUntraced(function*(
  value: string,
  maximum: number,
  exact?: number
) {
  if (
    value.length > Math.ceil((maximum * 4) / 3) ||
    value.length % 4 === 1 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return yield* fail()
  }

  const bytes = yield* ownBytes(
    Effect.fromResult(Base64Url.decode(value)).pipe(Effect.mapError(fail))
  )

  if (
    bytes.length > maximum ||
    (exact !== undefined && bytes.length !== exact) ||
    Base64Url.encode(bytes) !== value
  ) {
    return yield* fail()
  }

  return bytes
})

type Envelope = {
  readonly format: string
  readonly keyId: string
  readonly nonce: string
  readonly ciphertext: Redacted.Redacted<string>
}

/**
 * Serialization belongs to Auth; the owned AEAD service sees only bytes.
 *
 * @internal
 */
export const payloadEncryption = <C, P, S extends Envelope>(
  options: {
    readonly context: Schema.Codec<C, unknown, never, never>
    readonly plaintext: Schema.Codec<P, unknown, never, never>
    readonly envelope: Schema.Codec<S, unknown, never, never>
    readonly format: S["format"]
    readonly maximumPlaintextBytes: number
    readonly aad: (
      context: C,
      keyId: string
    ) => Effect.Effect<Uint8Array, OAuthUnavailable, Scope.Scope>
    readonly validate: (
      context: C,
      plaintext: P
    ) => Effect.Effect<P, OAuthUnavailable, Scope.Scope>
  },
  keyring: OAuthTransactionKeyring
) => {
  // Preserve the constructor-time detached snapshot, even if the caller changes
  // or wipes its configuration before building the Layer.
  const captured = snapshotKeyringSchema
    .result(keyring)
    .pipe(Result.mapError(() => OAuthConfigurationError.make({ reason: "keyring" })))

  const codec = Schema.fromJsonString(options.plaintext)
  const snapshotContext = makeOAuthSnapshot(options.context)
  const snapshotPlaintext = makeOAuthSnapshot(options.plaintext)
  const snapshotEnvelope = makeOAuthSnapshot(options.envelope)

  return Effect.gen(function*() {
    const configuration = yield* Effect.fromResult(captured)
    const random = yield* SecureRandom.SecureRandom
    const aead = yield* Aead.Aead
    const runOwned = yield* makeScopedOperation(fail)

    if (
      new Set(configuration.keys.map((entry) => entry.id)).size !== configuration.keys.length ||
      !configuration.keys.some((entry) => entry.id === configuration.activeKeyId)
    ) {
      return yield* OAuthConfigurationError.make({ reason: "keyring" })
    }

    const keys = yield* Effect.forEach(configuration.keys, (entry) =>
      Effect.gen(function*() {
        const material = yield* unwrap(entry.material)

        return { id: entry.id, bytes: yield* decodeBase64(material, 32, 32) }
      }).pipe(Effect.mapError(() => OAuthConfigurationError.make({ reason: "keyring" }))))

    const copyKey = Effect.fnUntraced(function*(id: string) {
      const key = keys.find((entry) => entry.id === id)

      if (key === undefined) return yield* fail()
      const bytes = yield* ownBytes(Effect.sync(() => new Uint8Array(key.bytes)))

      return Redacted.make(bytes)
    })

    // Teardown interrupts and joins active operations before retained keys are
    // wiped. Each operation also owns a copy, never a mutable keyring alias.
    const run = <A>(work: Effect.Effect<A, OAuthUnavailable, Scope.Scope>) => runOwned(Effect.scoped(work))

    return {
      seal: (context: C, value: P) =>
        run(
          Effect.gen(function*() {
            const detached = yield* snapshotContext.effect(context)

            const plaintext = yield* options.validate(
              detached,
              yield* snapshotPlaintext.effect(value)
            )

            const json = yield* Schema.encodeEffect(codec)(plaintext).pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, fail)))
            )

            const bytes = yield* encodeUtf8(json, options.maximumPlaintextBytes)
            const additionalData = yield* options.aad(detached, configuration.activeKeyId)
            const key = yield* copyKey(configuration.activeKeyId)

            const nonce = yield* ownBytes(
              random
                .randomBytes(24)
                .pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, fail))))
            )

            const ciphertext = yield* ownBytes(
              withSecret(key, (owned) =>
                native(Effect.gen(function*() {
                  const secretKey = yield* Aead.key(Aead.xchacha20Poly1305, owned)
                  return yield* aead.encrypt(secretKey, bytes, { nonce, aad: additionalData })
                }))).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, fail))))
            )

            // The generic envelope is an external Schema boundary, not an assertion.
            const sealed = yield* Schema.decodeUnknownEffect(Schema.toType(options.envelope))({
              format: options.format,
              keyId: configuration.activeKeyId,
              nonce: Base64Url.encode(nonce),
              ciphertext: Redacted.make(Base64Url.encode(ciphertext))
            }).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, fail))))

            return yield* snapshotEnvelope.effect(sealed)
          })
        ),
      open: (context: C, envelope: S) =>
        run(
          Effect.gen(function*() {
            const detached = yield* snapshotContext.effect(context)
            const sealed = yield* snapshotEnvelope.effect(envelope)
            const key = yield* copyKey(sealed.keyId)
            const nonce = yield* decodeBase64(sealed.nonce, 24, 24)

            const ciphertext = yield* decodeBase64(
              yield* unwrap(sealed.ciphertext),
              options.maximumPlaintextBytes + 16
            )

            const additionalData = yield* options.aad(detached, sealed.keyId)

            const plaintext = yield* ownBytes(
              withSecret(key, (owned) =>
                native(Effect.gen(function*() {
                  const secretKey = yield* Aead.key(Aead.xchacha20Poly1305, owned)
                  return yield* aead.decrypt(secretKey, ciphertext, { nonce, aad: additionalData })
                }))).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, fail))))
            )

            if (plaintext.length > options.maximumPlaintextBytes) return yield* fail()

            const json = yield* Effect.try({
              try: () => new TextDecoder("utf-8", { fatal: true }).decode(plaintext),
              catch: fail
            })

            const value = yield* Schema.decodeEffect(codec)(json).pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, fail)))
            )

            const canonical = yield* Schema.encodeEffect(codec)(value).pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, fail)))
            )

            if (canonical !== json) return yield* fail()

            return yield* options.validate(detached, value)
          })
        )
    }
  })
}

const snapshotKeyringSchema = makeOAuthSnapshot(keyringSchema)
