import type * as CryptoError from "effect/crypto/CryptoError"
import * as WebCrypto from "effect/crypto/WebCrypto"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { CryptoUnavailable, InvalidInput, type OperationError, UnsupportedAlgorithm } from "./cryptoErrors.ts"

export function decode<A>(
  schema: Schema.Codec<A, A>,
  input: A,
  reason: InvalidInput["reason"]
): Effect.Effect<A, InvalidInput> {
  // Erased Redacted values can defect during Schema decoding.
  return Effect.suspend(() => Schema.decodeEffect(schema)(input)).pipe(
    Effect.mapError(() => InvalidInput.make({ reason })),
    Effect.catchDefect(() => InvalidInput.make({ reason }))
  )
}

/** Discard native diagnostics, which may contain key material or plaintext. */
export function operationError(error: CryptoError.CryptoError): OperationError {
  switch (error.reason._tag) {
    case "InvalidKey":
      return InvalidInput.make({ reason: "key" })
    case "Unsupported":
      return UnsupportedAlgorithm.make({})
    case "BadArgument":
      if (Predicate.hasProperty(error.reason.cause, "name") && error.reason.cause.name === "SyntaxError") {
        return InvalidInput.make({ reason: "key" })
      }
      return CryptoUnavailable.make({})
    case "Unknown":
      // Deno may defer rejecting an invalid EC point until SPKI export.
      if (
        error.algorithm === "ECDSA" && error.method === "publicKeyToSpki" &&
        WebCrypto.isOperationError(error.reason.cause)
      ) {
        return InvalidInput.make({ reason: "key" })
      }
      return CryptoUnavailable.make({})
    default:
      return CryptoUnavailable.make({})
  }
}

/** Join native work before releasing or wiping its owned inputs. */
export function native<A, R>(
  effect: Effect.Effect<A, CryptoError.CryptoError, R>
): Effect.Effect<A, OperationError, R> {
  return effect.pipe(Effect.mapError(operationError), Effect.uninterruptible)
}

/** Own a secret copy until every native reader has settled. */
export function withSecret<A, E, R>(
  value: Redacted.Redacted<Uint8Array>,
  use: (owned: Uint8Array<ArrayBuffer>) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | InvalidInput, R> {
  return Effect.acquireUseRelease(
    decode(Schema.Redacted(Schema.Uint8Array, { disallowJsonEncode: true }), value, "data").pipe(
      Effect.flatMap((wrapped) => copy(Redacted.value(wrapped)))
    ),
    (owned) => Effect.uninterruptible(use(owned)),
    (owned) => Effect.sync(() => owned.fill(0))
  )
}

/** Release temporary private keys produced by native key constructors. */
export function withPrivateKey<K extends Redacted.Redacted<Uint8Array>, A, E, R, E2, R2>(
  key: Effect.Effect<K, E, R>,
  use: (key: K) => Effect.Effect<A, E2, R2>
): Effect.Effect<A, E | E2, R | R2> {
  return Effect.acquireUseRelease(
    key,
    (owned) => Effect.uninterruptible(use(owned)),
    (owned) => Effect.sync(() => Redacted.value(owned).fill(0))
  )
}

export function copy(value: Uint8Array): Effect.Effect<Uint8Array<ArrayBuffer>, InvalidInput> {
  return decode(Schema.Uint8Array, value, "data").pipe(
    Effect.flatMap((bytes) =>
      Effect.try({
        try: () => new Uint8Array(bytes),
        catch: () => InvalidInput.make({ reason: "data" })
      })
    )
  )
}

export const derBytes = Schema.Uint8Array.check(Schema.isMinLength(1), Schema.isMaxLength(16384))
