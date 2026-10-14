import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { CryptoUnavailable, InvalidInput, UnsupportedAlgorithm } from "./cryptoErrors.ts"

export const decode = <A>(schema: Schema.Codec<A, A>, input: A, reason: InvalidInput["reason"]) =>
  // Erased Redacted values can defect during Schema decoding. Keep decoder
  // construction and evaluation inside the typed, secret-safe input boundary.
  Effect.suspend(() => Schema.decodeEffect(schema)(input)).pipe(
    Effect.mapError(() => InvalidInput.make({ reason })),
    Effect.catchDefect(() => InvalidInput.make({ reason }))
  )

export const nativeErrorName = (cause: unknown): string | undefined =>
  Predicate.hasProperty(cause, "name") && Predicate.isString(cause.name) ? cause.name : undefined

export const nativeError = (cause: unknown) =>
  nativeErrorName(cause) === "NotSupportedError"
    ? UnsupportedAlgorithm.make({})
    : CryptoUnavailable.make({})

export const importError = (cause: unknown) =>
  nativeErrorName(cause) === "DataError" || nativeErrorName(cause) === "SyntaxError"
    ? InvalidInput.make({ reason: "key" })
    : nativeError(cause)

/** Own a secret copy through cleanup. Native users must join work that cannot be cancelled. */
export const withSecret = <A, E, R>(
  value: Redacted.Redacted<Uint8Array>,
  use: (owned: Uint8Array<ArrayBuffer>) => Effect.Effect<A, E, R>
) =>
  Effect.acquireUseRelease(
    Effect.try({
      try: () => new Uint8Array(Redacted.value(value)),
      catch: () => InvalidInput.make({ reason: "data" })
    }),
    use,
    (owned) => Effect.sync(() => owned.fill(0))
  )

export const copy = (value: Uint8Array) =>
  Effect.try({
    try: () => new Uint8Array(value),
    catch: () => InvalidInput.make({ reason: "data" })
  })
