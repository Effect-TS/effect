/**
 * Works with raw bytes stored in `Uint8Array` values.
 *
 * This module collects the small byte helpers that protocol, encoding, and
 * parsing code keeps needing: joining chunks, comparing byte sequences, and
 * searching for byte patterns.
 *
 * Byte-to-text conversions live in `TextEncoder` / `TextDecoder`, and hex or
 * base64 conversions live in the `Encoding` modules.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Equ from "./Equivalence.ts"
import { dual } from "./Function.ts"
import * as order from "./Order.ts"
import { isUint8Array } from "./Predicate.ts"

/**
 * Joins byte chunks into one new `Uint8Array`.
 *
 * **When to use**
 *
 * Use to combine frames, headers, or streamed chunks into a single buffer.
 *
 * **Gotchas**
 *
 * The result is always a new array, even when there is zero or one chunk, so
 * it never aliases an input.
 *
 * **Example** (Joining byte chunks)
 *
 * ```ts import.meta.vitest
 * import { Bytes } from "effect"
 *
 * const bytes = Bytes.concat([new Uint8Array([1, 2]), new Uint8Array([3])])
 * Array.from(bytes) // => [1, 2, 3]
 * ```
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.6
 */
export const concat = (chunks: ReadonlyArray<Uint8Array>): Uint8Array<ArrayBuffer> => {
  let length = 0
  for (let i = 0; i < chunks.length; i++) {
    length += chunks[i].length
  }
  const out = new Uint8Array(length)
  let offset = 0
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i], offset)
    offset += chunks[i].length
  }
  return out
}

/**
 * Compares byte sequences for equality, byte by byte.
 *
 * **Gotchas**
 *
 * This returns as soon as a byte differs, so it is not constant-time. Do not
 * use it to compare secrets.
 *
 * **Example** (Comparing byte sequences)
 *
 * ```ts import.meta.vitest
 * import { Bytes } from "effect"
 *
 * Bytes.Equivalence(new Uint8Array([1, 2]), new Uint8Array([1, 2])) // => true
 * Bytes.Equivalence(new Uint8Array([1, 2]), new Uint8Array([1])) // => false
 * ```
 *
 * @stability unstable
 * @category instances
 * @since 4.0.6
 */
export const Equivalence: Equ.Equivalence<Uint8Array> = Equ.make((self, that) => {
  if (self.length !== that.length) {
    return false
  }
  for (let i = 0; i < self.length; i++) {
    if (self[i] !== that[i]) {
      return false
    }
  }
  return true
})

/**
 * Checks whether two byte sequences contain the same bytes.
 *
 * **When to use**
 *
 * Use instead of `===`, which only checks whether both values are the same
 * `Uint8Array` instance.
 *
 * **Gotchas**
 *
 * This returns as soon as a byte differs, so it is not constant-time. Do not
 * use it to compare secrets.
 *
 * **Example** (Comparing byte sequences)
 *
 * ```ts import.meta.vitest
 * import { Bytes, pipe } from "effect"
 *
 * Bytes.equals(new Uint8Array([1, 2]), new Uint8Array([1, 2])) // => true
 * pipe(new Uint8Array([1, 2]), Bytes.equals(new Uint8Array([1]))) // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.0.6
 */
export const equals: {
  (that: Uint8Array): (self: Uint8Array) => boolean
  (self: Uint8Array, that: Uint8Array): boolean
} = dual(2, Equivalence)

/**
 * Orders byte sequences lexicographically by unsigned byte value, placing a
 * prefix before any longer sequence that starts with it.
 *
 * **Example** (Sorting byte sequences)
 *
 * ```ts import.meta.vitest
 * import { Bytes } from "effect"
 *
 * Bytes.Order(new Uint8Array([1, 2]), new Uint8Array([1, 3])) // => -1
 * Bytes.Order(new Uint8Array([2]), new Uint8Array([1, 9])) // => 1
 * Bytes.Order(new Uint8Array([1]), new Uint8Array([1, 0])) // => -1
 * ```
 *
 * @stability unstable
 * @category instances
 * @since 4.0.6
 */
export const Order: order.Order<Uint8Array> = order.make((self, that) => {
  const length = Math.min(self.length, that.length)
  for (let i = 0; i < length; i++) {
    if (self[i] !== that[i]) {
      return self[i] < that[i] ? -1 : 1
    }
  }
  return self.length < that.length ? -1 : self.length > that.length ? 1 : 0
})

/**
 * Returns the index of the first occurrence of `search` in `self`, or `-1`
 * when it does not occur.
 *
 * **When to use**
 *
 * Use to find multi-byte delimiters such as `\r\n\r\n` while parsing a byte
 * buffer. To find a single byte, use the native `Uint8Array#indexOf`.
 *
 * **Gotchas**
 *
 * Like `String#indexOf`, this returns `-1` rather than an `Option`, and an
 * empty `search` matches at `fromIndex` clamped to `[0, self.length]`.
 *
 * **Example** (Finding a delimiter)
 *
 * ```ts import.meta.vitest
 * import { Bytes } from "effect"
 *
 * const bytes = new Uint8Array([1, 13, 10, 2, 13, 10])
 * const crlf = new Uint8Array([13, 10])
 *
 * Bytes.indexOf(bytes, crlf) // => 1
 * Bytes.indexOf(bytes, crlf, 2) // => 4
 * Bytes.indexOf(bytes, new Uint8Array([9])) // => -1
 * ```
 *
 * @stability unstable
 * @category searching
 * @since 4.0.6
 */
export const indexOf: {
  (search: Uint8Array, fromIndex?: number): (self: Uint8Array) => number
  (self: Uint8Array, search: Uint8Array, fromIndex?: number): number
} = dual(
  (args) => isUint8Array(args[1]),
  (self: Uint8Array, search: Uint8Array, fromIndex?: number): number => {
    let start = fromIndex !== undefined && fromIndex > 0 ? Math.min(fromIndex, self.length) : 0
    if (search.length === 0) {
      return start
    }
    const first = search[0]
    const last = self.length - search.length
    while (start <= last) {
      const candidate = self.indexOf(first, start)
      if (candidate === -1 || candidate > last) {
        return -1
      }
      if (matchesAt(self, search, candidate)) {
        return candidate
      }
      start = candidate + 1
    }
    return -1
  }
)

/**
 * Checks whether `self` starts with `prefix`.
 *
 * **Example** (Checking a magic number)
 *
 * ```ts import.meta.vitest
 * import { Bytes } from "effect"
 *
 * const gzip = new Uint8Array([0x1f, 0x8b])
 *
 * Bytes.startsWith(new Uint8Array([0x1f, 0x8b, 0x08]), gzip) // => true
 * Bytes.startsWith(new Uint8Array([0x1f]), gzip) // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.0.6
 */
export const startsWith: {
  (prefix: Uint8Array): (self: Uint8Array) => boolean
  (self: Uint8Array, prefix: Uint8Array): boolean
} = dual(
  2,
  (self: Uint8Array, prefix: Uint8Array): boolean => prefix.length <= self.length && matchesAt(self, prefix, 0)
)

/**
 * Checks whether `self` ends with `suffix`.
 *
 * **Example** (Checking a trailer)
 *
 * ```ts import.meta.vitest
 * import { Bytes } from "effect"
 *
 * const crlf = new Uint8Array([13, 10])
 *
 * Bytes.endsWith(new Uint8Array([1, 13, 10]), crlf) // => true
 * Bytes.endsWith(new Uint8Array([13, 10, 1]), crlf) // => false
 * ```
 *
 * @stability unstable
 * @category predicates
 * @since 4.0.6
 */
export const endsWith: {
  (suffix: Uint8Array): (self: Uint8Array) => boolean
  (self: Uint8Array, suffix: Uint8Array): boolean
} = dual(
  2,
  (self: Uint8Array, suffix: Uint8Array): boolean =>
    suffix.length <= self.length && matchesAt(self, suffix, self.length - suffix.length)
)

const matchesAt = (self: Uint8Array, search: Uint8Array, offset: number): boolean => {
  for (let i = 0; i < search.length; i++) {
    if (self[offset + i] !== search[i]) {
      return false
    }
  }
  return true
}
