import * as Effect from "effect/Effect"
import * as Base64Encoding from "effect/encoding/Base64"
import * as Base64UrlEncoding from "effect/encoding/Base64Url"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import type { PasswordHashingConfig } from "./configuration.ts"
import { PasswordVerifierInvalid } from "./errors.ts"

const Decimal = Schema.String.check(Schema.isPattern(/^[1-9][0-9]{0,7}$/)).pipe(
  Schema.decodeTo(Schema.FiniteFromString)
)

const Base64 = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(86),
  Schema.isPattern(/^[A-Za-z0-9+/]+$/)
)

const Base64Url = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(86),
  Schema.isPattern(/^[A-Za-z0-9_-]+$/)
)

const Phc = Schema.TemplateLiteralParser([
  "$argon2id$v=19$m=",
  Decimal,
  ",t=",
  Decimal,
  ",p=",
  Decimal,
  "$",
  Base64,
  "$",
  Base64
])

const Legacy = Schema.TemplateLiteralParser([
  "pbkdf2-sha256$",
  Decimal,
  "$",
  Base64Url,
  "$",
  Base64Url
])

const Scrypt = Schema.TemplateLiteralParser([
  "$scrypt$ln=",
  Decimal,
  ",r=",
  Decimal,
  ",p=",
  Decimal,
  "$",
  Base64,
  "$",
  Base64
])

const Bounded = Schema.String.check(Schema.isMaxLength(512))

/** @internal */
export type ParsedPasswordHash =
  | {
    readonly _tag: "Scrypt"
    readonly cost: number
    readonly blockSize: number
    readonly parallelism: number
    readonly salt: Uint8Array
    readonly expected: Uint8Array
  }
  | {
    readonly _tag: "Argon2id"
    readonly memoryKiB: number
    readonly passes: number
    readonly parallelism: number
    readonly salt: Uint8Array
    readonly expected: Uint8Array
  }
  | {
    readonly _tag: "LegacyPbkdf2"
    readonly iterations: number
    readonly salt: Uint8Array
    readonly expected: Uint8Array
  }

/** @internal */
export const phcBase64 = (bytes: Uint8Array) => Base64Encoding.encode(bytes).replace(/=+$/u, "")

const decodeBytes = Effect.fnUntraced(function*(
  input: string,
  url: boolean,
  minimum: number,
  maximum: number
) {
  const decoded = yield* Effect.acquireRelease(
    Effect.fromResult(
      url
        ? Base64UrlEncoding.decode(input)
        : Base64Encoding.decode(input.padEnd(Math.ceil(input.length / 4) * 4, "="))
    ).pipe(Effect.mapError(() => PasswordVerifierInvalid.make({ reason: "malformed" }))),
    (bytes) => Effect.sync(() => bytes.fill(0)),
    { interruptible: true }
  )

  if (
    decoded.length < minimum ||
    decoded.length > maximum ||
    (url ? Base64UrlEncoding.encode(decoded) : phcBase64(decoded)) !== input
  ) {
    return yield* PasswordVerifierInvalid.make({ reason: "malformed" })
  }

  return decoded
})

/**
 * Invoke under admission: parse bounded metadata and reject costs before decoding
 * salt/output or allocating KDF memory. Only supported exact encodings are accepted.
 *
 * @internal
 */
export const parsePasswordHash = Effect.fnUntraced(function*(
  input: string,
  config: PasswordHashingConfig
): Effect.fn.Return<ParsedPasswordHash, PasswordVerifierInvalid, Scope.Scope> {
  yield* Schema.decodeEffect(Bounded)(input).pipe(
    Effect.mapError(() => PasswordVerifierInvalid.make({ reason: "malformed" }))
  )
  if (input.startsWith("$scrypt$")) {
    const [, logCost, , blockSize, , parallelism, , salt, , expected] =
      // eslint-disable-next-line no-restricted-properties -- Persisted verifier strings have not proved this encoding.
      yield* Schema.decodeUnknownEffect(Scrypt)(input).pipe(
        Effect.mapError(() => PasswordVerifierInvalid.make({ reason: "malformed" }))
      )

    if (logCost >= 16 * blockSize) {
      return yield* PasswordVerifierInvalid.make({ reason: "malformed" })
    }

    const cost = 2 ** logCost

    if (
      logCost > 31 ||
      blockSize * parallelism >= 2 ** 30 ||
      128 * blockSize * (cost + parallelism + 2) > config.maximumMemoryKiB * 1024 ||
      (cost * blockSize * parallelism) / 8 > config.maximumMemoryPasses
    ) {
      return yield* PasswordVerifierInvalid.make({ reason: "work-limit" })
    }

    return {
      _tag: "Scrypt",
      cost,
      blockSize,
      parallelism,
      salt: yield* decodeBytes(salt, false, 8, 48),
      expected: yield* decodeBytes(expected, false, 16, 64)
    }
  }

  if (input.startsWith("$argon2id$")) {
    const [, memoryKiB, , passes, , parallelism, , salt, , expected] =
      // eslint-disable-next-line no-restricted-properties -- Persisted verifier strings have not yet proved this template literal encoding.
      yield* Schema.decodeUnknownEffect(Phc)(input).pipe(
        Effect.mapError(() => PasswordVerifierInvalid.make({ reason: "malformed" }))
      )

    if (
      memoryKiB < 8 * parallelism ||
      memoryKiB > config.maximumMemoryKiB ||
      passes > config.maximumPasses ||
      parallelism > config.maximumParallelism ||
      memoryKiB * passes > config.maximumMemoryPasses
    ) {
      return yield* PasswordVerifierInvalid.make({ reason: "work-limit" })
    }

    return {
      _tag: "Argon2id",
      memoryKiB,
      passes,
      parallelism,
      salt: yield* decodeBytes(salt, false, 8, 48),
      expected: yield* decodeBytes(expected, false, 16, 64)
    }
  }

  // eslint-disable-next-line no-restricted-properties -- Persisted legacy verifier strings are an untrusted storage boundary.
  const [, iterations, , salt, , expected] = yield* Schema.decodeUnknownEffect(Legacy)(input).pipe(
    Effect.mapError(() => PasswordVerifierInvalid.make({ reason: "malformed" }))
  )

  if (iterations > config.maximumLegacyIterations) {
    return yield* PasswordVerifierInvalid.make({ reason: "work-limit" })
  }

  return {
    _tag: "LegacyPbkdf2",
    iterations,
    salt: yield* decodeBytes(salt, true, 1, 64),
    expected: yield* decodeBytes(expected, true, 32, 32)
  }
})
