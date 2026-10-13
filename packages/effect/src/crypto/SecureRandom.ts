/**
 * Cryptographically secure randomness: random bytes, numbers, shuffles,
 * UUIDs, and ULIDs.
 *
 * {@link layer} draws from `globalThis.crypto.getRandomValues`, and
 * {@link make} builds the service from any secure byte source.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as internalRandom from "../internal/random.ts"
import * as Ulid from "../internal/ulid.ts"
import * as Uuid from "../internal/uuid.ts"
import * as Layer from "../Layer.ts"
import * as CryptoError from "./CryptoError.ts"

const SecureRandomTypeId = "~effect/crypto/SecureRandom"

/**
 * Service that generates cryptographically secure random values.
 *
 * **Details**
 *
 * Implementations supply secure random bytes, and `make` derives every other
 * operation from them. The service is structurally compatible with `Random`.
 *
 * @see {@link make} for constructing the service from a byte source
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface SecureRandom {
  readonly [SecureRandomTypeId]: typeof SecureRandomTypeId

  /**
   * Generates a random integer in the range Number.MIN_SAFE_INTEGER to
   * Number.MAX_SAFE_INTEGER (both inclusive).
   */
  nextIntUnsafe(): number

  /**
   * Generates a random number in the range 0 (inclusive) to 1 (exclusive).
   */
  nextDoubleUnsafe(): number

  /**
   * Generates cryptographically secure random bytes.
   */
  randomBytes(size: number): Effect.Effect<Uint8Array, CryptoError.CryptoError>

  /**
   * Generates a cryptographically secure random number between 0 (inclusive)
   * and 1 (exclusive).
   */
  readonly random: Effect.Effect<number>

  /**
   * Generates a cryptographically secure random boolean with equal probability
   * for both values.
   */
  readonly randomBoolean: Effect.Effect<boolean>

  /**
   * Generates a cryptographically secure random integer between
   * `Number.MIN_SAFE_INTEGER` and `Number.MAX_SAFE_INTEGER` (both inclusive).
   */
  readonly randomInt: Effect.Effect<number>

  /**
   * Generates a cryptographically secure random number between `min`
   * (inclusive) and `max` (exclusive).
   */
  randomBetween(min: number, max: number): Effect.Effect<number>

  /**
   * Generates a cryptographically secure random integer between `min` and `max`.
   *
   * **Details**
   *
   * The lower bound is rounded up with `Math.ceil` and the upper bound is
   * rounded down with `Math.floor`. By default the range is inclusive; set
   * `options.halfOpen: true` to exclude the upper bound.
   * Rejection sampling gives each integer the same probability.
   * Empty ranges and bounds that do not round to safe integers die with
   * `RangeError`.
   */
  randomIntBetween(min: number, max: number, options?: {
    readonly halfOpen?: boolean | undefined
  }): Effect.Effect<number>

  /**
   * Uses the cryptographically secure random generator to shuffle the supplied
   * iterable.
   */
  randomShuffle<A>(elements: Iterable<A>): Effect.Effect<Array<A>>

  /**
   * Generates a cryptographically secure UUIDv4.
   *
   * **Details**
   *
   * The default `"hex"` format returns a lowercase, hyphenated UUID string
   * (36 characters), not a bare hexadecimal string. The `"bytes"` format
   * returns the 16 UUID bytes, including the version and variant bits.
   */
  randomUUIDv4(options?: {
    readonly format?: "hex" | undefined
  }): Effect.Effect<string, CryptoError.CryptoError>
  randomUUIDv4<Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, CryptoError.CryptoError>
  randomUUIDv4(options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, CryptoError.CryptoError>

  /**
   * Generates a cryptographically secure UUIDv7 using the `Clock` timestamp.
   *
   * **Details**
   *
   * The default `"hex"` format returns a lowercase, hyphenated UUID string
   * (36 characters), not a bare hexadecimal string. The `"bytes"` format
   * returns the 16 UUID bytes, including the timestamp, version and variant bits.
   */
  randomUUIDv7(options?: {
    readonly format?: "hex" | undefined
  }): Effect.Effect<string, CryptoError.CryptoError>
  randomUUIDv7<Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, CryptoError.CryptoError>
  randomUUIDv7(options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, CryptoError.CryptoError>

  /**
   * Generates a cryptographically secure ULID string.
   *
   * **Details**
   *
   * ULIDs contain 26 uppercase Crockford base32 characters. The first 10 encode
   * the `Clock` timestamp in milliseconds; the remaining 16 encode 80 random
   * bits. ULIDs sort by timestamp, with no ordering guarantee within the same
   * millisecond.
   *
   * Timestamp normalization matches UUIDv7: fractions are truncated, values are
   * clamped to the 48-bit range, and `NaN` encodes as zero.
   */
  readonly randomULID: Effect.Effect<string, CryptoError.CryptoError>
}

/**
 * Service tag for cryptographically secure randomness.
 *
 * **When to use**
 *
 * Use to provide or retrieve the secure random generator from an effect's
 * context.
 *
 * @see {@link make} for constructing the service from a byte source
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const SecureRandom: Context.Service<SecureRandom, SecureRandom> = Context.Service("effect/crypto/SecureRandom")

/**
 * Generates cryptographically secure random bytes using the SecureRandom
 * service.
 *
 * **Gotchas**
 *
 * The size must be a non-negative safe integer. Invalid sizes fail with a
 * `BadArgument` reason, and random source failures with `Unknown`.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomBytes = (size: number): Effect.Effect<Uint8Array, CryptoError.CryptoError, SecureRandom> =>
  Effect.flatMap(SecureRandom, (random) => random.randomBytes(size))

/**
 * Generates a cryptographically secure number between zero, inclusive, and one,
 * exclusive, using the SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const random: Effect.Effect<number, never, SecureRandom> = Effect.flatMap(SecureRandom, (r) => r.random)

/**
 * Generates a cryptographically secure boolean with equal probability for both
 * values using the SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomBoolean: Effect.Effect<boolean, never, SecureRandom> = Effect.flatMap(
  SecureRandom,
  (r) => r.randomBoolean
)

/**
 * Generates a cryptographically secure integer across the full safe-integer
 * range using the SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomInt: Effect.Effect<number, never, SecureRandom> = Effect.flatMap(SecureRandom, (r) => r.randomInt)

/**
 * Generates a cryptographically secure number between `min`, inclusive, and
 * `max`, exclusive, using the SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomBetween = (min: number, max: number): Effect.Effect<number, never, SecureRandom> =>
  Effect.flatMap(SecureRandom, (r) => r.randomBetween(min, max))

/**
 * Generates a uniformly distributed cryptographically secure integer between
 * `min` and `max` using the SecureRandom service.
 *
 * **Details**
 *
 * The lower bound is rounded up and the upper bound is rounded down. Both
 * bounds are inclusive unless `options.halfOpen` excludes the upper bound.
 *
 * **Gotchas**
 *
 * Empty ranges and bounds that do not round to safe integers die with
 * `RangeError` when the service is constructed with `make`.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomIntBetween = (min: number, max: number, options?: {
  readonly halfOpen?: boolean | undefined
}): Effect.Effect<number, never, SecureRandom> =>
  Effect.flatMap(SecureRandom, (r) => r.randomIntBetween(min, max, options))

/**
 * Shuffles an iterable using cryptographically secure random choices from the
 * SecureRandom service.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomShuffle = <A>(elements: Iterable<A>): Effect.Effect<Array<A>, never, SecureRandom> =>
  Effect.flatMap(SecureRandom, (r) => r.randomShuffle(elements))

/**
 * Generates a cryptographically secure UUIDv4 using the SecureRandom service.
 *
 * **Details**
 *
 * The default `"hex"` format returns a lowercase, hyphenated UUID string; the
 * `"bytes"` format returns the 16 UUID bytes.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomUUIDv4: {
  (options?: {
    readonly format?: "hex" | undefined
  }): Effect.Effect<string, CryptoError.CryptoError, SecureRandom>
  <Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, CryptoError.CryptoError, SecureRandom>
  (options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, CryptoError.CryptoError, SecureRandom>
} =
  ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
    Effect.flatMap(SecureRandom, (r) => r.randomUUIDv4(options))) as any

/**
 * Generates a cryptographically secure UUIDv7 using the SecureRandom service
 * and the current Clock timestamp.
 *
 * **Details**
 *
 * The default `"hex"` format returns a lowercase, hyphenated UUID string; the
 * `"bytes"` format returns the 16 UUID bytes.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomUUIDv7: {
  (options?: {
    readonly format?: "hex" | undefined
  }): Effect.Effect<string, CryptoError.CryptoError, SecureRandom>
  <Format extends "hex" | "bytes">(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, CryptoError.CryptoError, SecureRandom>
  (options?: {
    readonly format?: "hex" | "bytes" | undefined
  }): Effect.Effect<string | Uint8Array, CryptoError.CryptoError, SecureRandom>
} =
  ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
    Effect.flatMap(SecureRandom, (r) => r.randomUUIDv7(options))) as any

/**
 * Generates a cryptographically secure ULID using the SecureRandom service and
 * the current Clock timestamp.
 *
 * **Details**
 *
 * The result contains 26 uppercase Crockford base32 characters. ULIDs sort by
 * timestamp, with no ordering guarantee within the same millisecond.
 *
 * @stability unstable
 * @category generators
 * @since 4.0.0
 */
export const randomULID: Effect.Effect<string, CryptoError.CryptoError, SecureRandom> = Effect.flatMap(
  SecureRandom,
  (r) => r.randomULID
)

/**
 * Creates a `SecureRandom` service from a secure byte source.
 *
 * **When to use**
 *
 * Use to build a SecureRandom service for a platform integration, test layer,
 * or custom runtime.
 *
 * **Details**
 *
 * Random numbers, booleans, integer ranges, shuffling, UUIDs, and ULIDs are
 * derived from `randomBytes`. Exceptions thrown by `randomBytes` fail with a
 * `CryptoError` whose reason is `Unknown`.
 *
 * **Gotchas**
 *
 * `randomBytes` must return fresh, cryptographically secure bytes of the
 * requested length. UUID formatting mutates the returned array, so each call
 * must return a new array.
 *
 * **Example** (Creating a SecureRandom service)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { SecureRandom } from "effect/crypto"
 *
 * const random = SecureRandom.make((size) => globalThis.crypto.getRandomValues(new Uint8Array(size)))
 *
 * const bytes = await Effect.runPromise(random.randomBytes(4))
 * bytes.length // => 4
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (randomBytesUnsafe: (size: number) => Uint8Array): SecureRandom => {
  const tryRandom = <A>(method: string, f: () => A): Effect.Effect<A, CryptoError.CryptoError> =>
    Effect.try({
      try: f,
      catch: (cause) =>
        new CryptoError.CryptoError({
          algorithm: "SecureRandom",
          method,
          reason: new CryptoError.Unknown({ description: "Could not generate secure random bytes", cause })
        })
    })

  const randomBytes: SecureRandom["randomBytes"] = (size) =>
    Number.isSafeInteger(size) && size >= 0
      ? tryRandom("randomBytes", () => randomBytesUnsafe(size))
      : Effect.fail(
        new CryptoError.CryptoError({
          algorithm: "SecureRandom",
          method: "randomBytes",
          reason: new CryptoError.BadArgument({ description: "size must be a non-negative safe integer" })
        })
      )

  const readUint53 = (bytes: Uint8Array): number =>
    ((bytes[0] & 0x1f) * 2 ** 48) + (bytes[1] * 2 ** 40) + (bytes[2] * 2 ** 32) +
    (bytes[3] * 2 ** 24) + (bytes[4] * 2 ** 16) + (bytes[5] * 2 ** 8) + bytes[6]

  const nextDoubleUnsafe = (): number => readUint53(randomBytesUnsafe(7)) / 2 ** 53

  const nextIntUnsafe = (): number => {
    while (true) {
      const bytes = randomBytesUnsafe(7)
      const value = readUint53(bytes)
      if ((bytes[0] & 0x20) === 0) {
        return value + Number.MIN_SAFE_INTEGER
      }
      if (value < Number.MAX_SAFE_INTEGER) {
        return value + 1
      }
    }
  }

  // Batch 7-byte draws without consuming extra bytes or retaining randomness
  // across operations. Rejection draws refill one at a time after the batch.
  const makeDrawSource = (expected: number): () => Uint8Array => {
    let bytes: Uint8Array = new Uint8Array(0)
    let offset = 0
    return () => {
      if (offset === bytes.length) {
        bytes = randomBytesUnsafe(7 * Math.max(1, Math.min(expected, 585)))
        offset = 0
      }
      expected--
      offset += 7
      return bytes.subarray(offset - 7, offset)
    }
  }

  const nextIntBetweenUnsafe = (
    min: number,
    max: number,
    halfOpen = false,
    draw: () => Uint8Array = () => randomBytesUnsafe(7)
  ): number => {
    const minInt = Math.ceil(min)
    const maxInt = Math.floor(max)
    if (!Number.isSafeInteger(minInt) || !Number.isSafeInteger(maxInt)) {
      throw new RangeError("bounds must round to safe integers")
    }
    if (maxInt - minInt < Number.MAX_SAFE_INTEGER) {
      // Every intermediate stays below 2^53, and `%` is exact, so the
      // divisions below are exact without BigInt.
      const count = maxInt - minInt + (halfOpen ? 0 : 1)
      if (count <= 0) {
        throw new RangeError("range must contain at least one integer")
      }
      // `+ 0` turns `Math.ceil` of a value in (-1, 0) into 0 instead of -0.
      if (count === 1) return minInt + 0
      const bucketSize = (2 ** 53 - (2 ** 53 % count)) / count
      const limit = bucketSize * count
      while (true) {
        const value = readUint53(draw())
        if (value < limit) return minInt + (value - (value % bucketSize)) / bucketSize
      }
    }
    // Use 54 bits only for ranges wider than a 53-bit draw. BigInt keeps
    // every integer distinct when the range crosses the safe-integer domain.
    const lower = BigInt(minInt)
    const count = BigInt(maxInt) - lower + (halfOpen ? BigInt("0") : BigInt("1"))
    const wide = count > BigInt("1") << BigInt("53")
    const bucketSize = (wide ? BigInt("1") << BigInt("54") : BigInt("1") << BigInt("53")) / count
    const limit = bucketSize * count
    while (true) {
      const bytes = draw()
      const value = BigInt(readUint53(bytes)) +
        (wide && (bytes[0] & 0x20) !== 0 ? BigInt("1") << BigInt("53") : BigInt("0"))
      if (value < limit) return Number(lower + value / bucketSize)
    }
  }

  return SecureRandom.of({
    [SecureRandomTypeId]: SecureRandomTypeId,
    randomBytes,
    nextDoubleUnsafe,
    nextIntUnsafe,
    random: Effect.sync(() => nextDoubleUnsafe()),
    randomBoolean: Effect.sync(() => nextDoubleUnsafe() >= 0.5),
    randomInt: Effect.sync(() => nextIntUnsafe()),
    randomBetween: (min, max) =>
      Effect.sync(() => {
        const draw = nextDoubleUnsafe()
        return Number.isFinite(min) && Number.isFinite(max) && !Number.isFinite(max - min)
          ? min * (1 - draw) + max * draw
          : internalRandom.nextBetween(min, max, draw)
      }),
    randomIntBetween: (min, max, options) => Effect.sync(() => nextIntBetweenUnsafe(min, max, options?.halfOpen)),
    randomShuffle: (elements) =>
      Effect.sync(() => {
        const buffer = Array.from(elements)
        const draw = makeDrawSource(buffer.length - 1)
        for (let i = buffer.length - 1; i >= 1; i = i - 1) {
          const index = nextIntBetweenUnsafe(0, i, false, draw)
          const value = buffer[i]!
          buffer[i] = buffer[index]!
          buffer[index] = value
        }
        return buffer
      }),
    randomUUIDv4: ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
      tryRandom("randomUUIDv4", () => {
        const bytes = Uuid.v4Bytes(randomBytesUnsafe(16))
        return options?.format === "bytes" ? bytes : Uuid.stringify(bytes)
      })) as SecureRandom["randomUUIDv4"],
    randomUUIDv7: ((options?: { readonly format?: "hex" | "bytes" | undefined }) =>
      Effect.clockWith((clock) =>
        tryRandom("randomUUIDv7", () => {
          const bytes = Uuid.v7Bytes(clock.currentTimeMillisUnsafe(), randomBytesUnsafe(16))
          return options?.format === "bytes" ? bytes : Uuid.stringify(bytes)
        })
      )) as SecureRandom["randomUUIDv7"],
    randomULID: Effect.clockWith((clock) =>
      tryRandom("randomULID", () =>
        Ulid.ulidString(clock.currentTimeMillisUnsafe(), randomBytesUnsafe(10)))
    )
  })
}

/**
 * Layer that provides `SecureRandom` using `globalThis.crypto.getRandomValues`.
 *
 * **Details**
 *
 * Requests larger than the 65,536-byte `getRandomValues` limit are filled in
 * chunks. Only `getRandomValues` is needed, so the layer also works in
 * insecure browser contexts without `crypto.subtle`.
 *
 * **Gotchas**
 *
 * The layer fails to build with an `Unsupported` reason when the runtime has
 * no global `crypto` object, such as Node.js 18. Use the Node.js platform
 * package's `layerSecureRandom` there.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<SecureRandom, CryptoError.CryptoError> = Layer.effect(
  SecureRandom,
  Effect.suspend(() => {
    const crypto = globalThis.crypto
    if (crypto === undefined) {
      return Effect.fail(
        new CryptoError.CryptoError({
          algorithm: "SecureRandom",
          method: "layer",
          reason: new CryptoError.Unsupported({ description: "Web Crypto is unavailable" })
        })
      )
    }
    return Effect.succeed(make((size) => {
      const bytes = new Uint8Array(size)
      for (let offset = 0; offset < bytes.length; offset += 65_536) {
        crypto.getRandomValues(bytes.subarray(offset, offset + 65_536))
      }
      return bytes
    }))
  })
)
