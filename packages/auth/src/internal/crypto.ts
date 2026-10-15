import type * as CryptoError from "effect/crypto/CryptoError"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { CryptoUnavailable, InvalidInput, type OperationError, UnsupportedAlgorithm } from "../JoseError.ts"

/** @internal */
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

/**
 * Discard native diagnostics, which may contain key material or plaintext.
 * @internal
 */
export function operationError(error: CryptoError.CryptoError): OperationError {
  switch (error.reason._tag) {
    case "InvalidKey":
      return InvalidInput.make({ reason: "key" })
    case "Unsupported":
      return UnsupportedAlgorithm.make({})
    case "InvalidArgument":
      if (Predicate.hasProperty(error.reason.cause, "name") && error.reason.cause.name === "SyntaxError") {
        return InvalidInput.make({ reason: "key" })
      }
      return CryptoUnavailable.make({})
    default:
      return CryptoUnavailable.make({})
  }
}

/** @internal */
export function defectError(cause: unknown): OperationError {
  return Predicate.hasProperty(cause, "name") && cause.name === "SyntaxError"
    ? InvalidInput.make({ reason: "key" })
    : CryptoUnavailable.make({})
}

/**
 * Join native work before releasing or wiping its owned inputs.
 * @internal
 */
export function native<A, R>(
  effect: Effect.Effect<A, CryptoError.CryptoError, R>,
  onDefect: (cause: unknown) => OperationError = defectError
): Effect.Effect<A, OperationError, R> {
  return effect.pipe(
    Effect.mapError(operationError),
    Effect.catchDefect((cause) => Effect.fail(onDefect(cause))),
    Effect.uninterruptible
  )
}

/**
 * Own a secret copy until every native reader has settled.
 * @internal
 */
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

/** @internal */
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

/** @internal */
export const derBytes = Schema.Uint8Array.check(Schema.isMinLength(1), Schema.isMaxLength(16384))
