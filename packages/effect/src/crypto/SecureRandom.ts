/**
 * Cryptographically secure randomness: random bytes, uniform integers,
 * shuffles, UUIDv4, UUIDv7, and ULIDs.
 *
 * The {@link SecureRandom} service is built from one `randomBytes` primitive
 * with {@link make}. {@link layerWebCrypto} draws from `getRandomValues` on
 * the `WebCrypto` reference. The `*Unsafe` functions draw synchronously from
 * `globalThis.crypto` for code that cannot use a service, such as constructors
 * and model defaults.
 *
 * Every operation has a `never` error channel. A bad size or an empty range is
 * a defect.
 *
 * **Gotchas**
 *
 * There are no float, boolean, or full-range integer helpers. Insecure random
 * numbers belong to `effect/Random`, and a secure bit is `randomBytes(1)`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Ulid from "../internal/ulid.ts"
import * as Uuid from "../internal/uuid.ts"
import * as Layer from "../Layer.ts"
import { WebCrypto } from "./WebCrypto.ts"

/**
 * Output format of the UUID functions: a lowercase, hyphenated string, or the
 * 16 UUID bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type UuidFormat = "string" | "bytes"

/**
 * Generates a UUID in the requested format.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface UuidGenerator<R> {
  (options?: { readonly format?: "string" | undefined }): Effect.Effect<string, never, R>
  <Format extends UuidFormat>(options: {
    readonly format: Format
  }): Effect.Effect<Format extends "bytes" ? Uint8Array : string, never, R>
}

/**
 * Service that generates cryptographically secure random values.
 *
 * **Details**
 *
 * Every operation is derived from `randomBytes`. See {@link make}.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class SecureRandom extends Context.Service<SecureRandom, {
  /**
   * Generates `size` cryptographically secure random bytes.
   *
   * A negative or non-integer size dies with a `RangeError`.
   */
  readonly randomBytes: (size: number) => Effect.Effect<Uint8Array>

  /**
   * Generates an integer between `min` and `max`, both inclusive unless
   * `halfOpen` excludes `max`.
   *
   * **Details**
   *
   * The result is exactly uniform: draws that would bias it are rejected.
   * `min` is rounded up and `max` down. An empty range, or bounds that do not
   * round to safe integers, die with a `RangeError`.
   */
  readonly intBetween: (min: number, max: number, options?: {
    readonly halfOpen?: boolean | undefined
  }) => Effect.Effect<number>

  /**
   * Returns a uniformly shuffled copy of the elements, using Fisher-Yates over
   * `intBetween`.
   */
  readonly shuffle: <A>(elements: Iterable<A>) => Effect.Effect<Array<A>>

  /**
   * Generates a UUIDv4, as a lowercase hyphenated string or, with
   * `format: "bytes"`, the 16 UUID bytes.
   */
  readonly uuidV4: UuidGenerator<never>

  /**
   * Generates a UUIDv7 from the `Clock` timestamp, as a lowercase hyphenated
   * string or, with `format: "bytes"`, the 16 UUID bytes.
   */
  readonly uuidV7: UuidGenerator<never>

  /**
   * Generates a ULID from the `Clock` timestamp: 26 uppercase Crockford
   * base32 characters, sorting by timestamp with no ordering guarantee within
   * a millisecond.
   */
  readonly ulid: Effect.Effect<string>
}>()("effect/crypto/SecureRandom") {}

const checkSize = (size: number): void => {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new RangeError("size must be a non-negative safe integer")
  }
}

const readUint53 = (bytes: Uint8Array): number =>
  ((bytes[0] & 0x1f) * 2 ** 48) + (bytes[1] * 2 ** 40) + (bytes[2] * 2 ** 32) +
  (bytes[3] * 2 ** 24) + (bytes[4] * 2 ** 16) + (bytes[5] * 2 ** 8) + bytes[6]

// Draws an integer by rejection sampling over 53-bit (or, for ranges wider than
// 2^53, 54-bit) draws, so every integer in the range has the same probability.
const intBetweenUnsafe = (
  min: number,
  max: number,
  halfOpen: boolean,
  draw: () => Uint8Array
): number => {
  const minInt = Math.ceil(min)
  const maxInt = Math.floor(max)
  if (!Number.isSafeInteger(minInt) || !Number.isSafeInteger(maxInt)) {
    throw new RangeError("bounds must round to safe integers")
  }
  if (maxInt - minInt < Number.MAX_SAFE_INTEGER) {
    // Every intermediate stays below 2^53, and `%` is exact, so the divisions
    // below are exact without BigInt.
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
  // BigInt keeps every integer distinct when the range is wider than 2^53.
  const lower = BigInt(minInt)
  const count = BigInt(maxInt) - lower + (halfOpen ? BigInt(0) : BigInt(1))
  const wide = count > BigInt(1) << BigInt(53)
  const bucketSize = (wide ? BigInt(1) << BigInt(54) : BigInt(1) << BigInt(53)) / count
  const limit = bucketSize * count
  while (true) {
    const bytes = draw()
    const value = BigInt(readUint53(bytes)) + (wide && (bytes[0] & 0x20) !== 0 ? BigInt(1) << BigInt(53) : BigInt(0))
    if (value < limit) return Number(lower + value / bucketSize)
  }
}

const makeUuid = (
  bytes: (randomBytes: Uint8Array) => Uint8Array,
  randomBytes: (size: number) => Uint8Array,
  format: UuidFormat | undefined
): string | Uint8Array => {
  const uuid = bytes(randomBytes(16))
  return format === "bytes" ? uuid : Uuid.stringify(uuid)
}

/**
 * Creates a `SecureRandom` service from a secure byte source.
 *
 * **When to use**
 *
 * Use to build the service for a platform integration, a custom runtime, or a
 * seeded test double.
 *
 * **Details**
 *
 * Every operation is derived from `randomBytes`. Sizes are checked before it
 * is called, and an exception it throws is a defect.
 *
 * **Gotchas**
 *
 * `randomBytes` must return a fresh array of exactly `size` secure random
 * bytes. UUID formatting mutates the returned array.
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
export const make = (randomBytes: (size: number) => Uint8Array): SecureRandom["Service"] => {
  const randomBytesChecked = (size: number): Uint8Array => {
    checkSize(size)
    return randomBytes(size)
  }
  const draw = () => randomBytes(7)
  return {
    randomBytes: (size) => Effect.sync(() => randomBytesChecked(size)),
    intBetween: (min, max, options) => Effect.sync(() => intBetweenUnsafe(min, max, options?.halfOpen ?? false, draw)),
    shuffle: <A>(elements: Iterable<A>) =>
      Effect.sync(() => {
        const buffer = Array.from(elements)
        for (let i = buffer.length - 1; i >= 1; i--) {
          const index = intBetweenUnsafe(0, i, false, draw)
          const value = buffer[i]!
          buffer[i] = buffer[index]!
          buffer[index] = value
        }
        return buffer
      }),
    uuidV4:
      ((options?: { readonly format?: UuidFormat | undefined }) =>
        Effect.sync(() => makeUuid(Uuid.v4Bytes, randomBytes, options?.format))) as UuidGenerator<never>,
    uuidV7:
      ((options?: { readonly format?: UuidFormat | undefined }) =>
        Effect.clockWith((clock) =>
          Effect.sync(() =>
            makeUuid((bytes) => Uuid.v7Bytes(clock.currentTimeMillisUnsafe(), bytes), randomBytes, options?.format)
          )
        )) as UuidGenerator<never>,
    ulid: Effect.clockWith((clock) =>
      Effect.sync(() => Ulid.ulidString(clock.currentTimeMillisUnsafe(), randomBytes(10)))
    )
  }
}

// `getRandomValues` throws a `QuotaExceededError` above 65,536 bytes.
const fillRandom = (crypto: Crypto, size: number): Uint8Array => {
  const bytes = new Uint8Array(size)
  for (let offset = 0; offset < size; offset += 65_536) {
    crypto.getRandomValues(bytes.subarray(offset, offset + 65_536))
  }
  return bytes
}

/**
 * Layer that provides `SecureRandom` from `getRandomValues` on the `WebCrypto`
 * reference.
 *
 * **Details**
 *
 * Requests above the 65,536-byte `getRandomValues` limit are filled in chunks.
 * Only `getRandomValues` is needed, so the layer also works in insecure browser
 * contexts, which have no `crypto.subtle`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebCrypto: Layer.Layer<SecureRandom> = Layer.effect(
  SecureRandom,
  WebCrypto.use((crypto) => Effect.succeed(make((size) => fillRandom(crypto, size))))
)

/**
 * Synchronously generates `size` cryptographically secure random bytes from
 * `globalThis.crypto`.
 *
 * **When to use**
 *
 * Use when a service cannot be read, as in constructors and model defaults.
 * Elsewhere, use the `SecureRandom` service.
 *
 * **Gotchas**
 *
 * Reads `globalThis.crypto` directly, so neither the `WebCrypto` reference nor
 * a mocked `SecureRandom` service affects it. A negative or non-integer size
 * throws a `RangeError`.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const randomBytesUnsafe = (size: number): Uint8Array => {
  checkSize(size)
  return fillRandom(globalThis.crypto, size)
}

/**
 * Synchronously generates a UUIDv4 from `globalThis.crypto`, as a lowercase
 * hyphenated string or, with `format: "bytes"`, the 16 UUID bytes.
 *
 * **Gotchas**
 *
 * Reads `globalThis.crypto` directly, so neither the `WebCrypto` reference nor
 * a mocked `SecureRandom` service affects it.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const uuidV4Unsafe: {
  (options?: { readonly format?: "string" | undefined }): string
  <Format extends UuidFormat>(options: { readonly format: Format }): Format extends "bytes" ? Uint8Array : string
} =
  ((options?: { readonly format?: UuidFormat | undefined }) =>
    makeUuid(Uuid.v4Bytes, randomBytesUnsafe, options?.format)) as any

/**
 * Synchronously generates a UUIDv7 from `Date.now()` and `globalThis.crypto`,
 * as a lowercase hyphenated string or, with `format: "bytes"`, the 16 UUID
 * bytes.
 *
 * **Gotchas**
 *
 * Reads `Date.now()` rather than the `Clock`, and `globalThis.crypto` rather
 * than the `WebCrypto` reference.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const uuidV7Unsafe: {
  (options?: { readonly format?: "string" | undefined }): string
  <Format extends UuidFormat>(options: { readonly format: Format }): Format extends "bytes" ? Uint8Array : string
} =
  ((options?: { readonly format?: UuidFormat | undefined }) =>
    makeUuid((bytes) => Uuid.v7Bytes(Date.now(), bytes), randomBytesUnsafe, options?.format)) as any

/**
 * Synchronously generates a ULID from `Date.now()` and `globalThis.crypto`.
 *
 * **Gotchas**
 *
 * Reads `Date.now()` rather than the `Clock`, and `globalThis.crypto` rather
 * than the `WebCrypto` reference.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const ulidUnsafe = (): string => Ulid.ulidString(Date.now(), randomBytesUnsafe(10))
