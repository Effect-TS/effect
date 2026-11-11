/**
 * Inspects, joins and compares byte sequences stored in `Uint8Array` values.
 *
 * Byte-to-text conversions live in `TextEncoder` / `TextDecoder`, and hex or
 * base64 conversions live in the `Encoding` modules.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Data from "./Data.ts"
import * as Equ from "./Equivalence.ts"
import { identity } from "./Function.ts"
import * as order from "./Order.ts"
import * as Result from "./Result.ts"

/**
 * Error returned when a byte view has an unsupported type or unusable backing storage.
 *
 * @see {@link byteLength} for validating a view and reading its length
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class ByteViewError extends Data.TaggedError("ByteViewError")<{
  readonly reason: "InvalidInput" | "SharedBuffer" | "DetachedBuffer" | "OutOfBounds"
}> {}

/**
 * Returns the actual byte length of an attached, non-shared `Uint8Array` view.
 *
 * **Details**
 *
 * Accepts same-realm Uint8Arrays, including empty arrays, subviews and Node
 * Buffers. Built-in getters ignore shadowed instance properties and custom
 * iterators. The input bytes are neither copied nor modified.
 *
 * **Gotchas**
 *
 * Shared or detached buffers and out-of-bounds resizable-buffer views fail.
 * A successful check does not prevent the buffer from being resized or
 * detached later; validate again when using a view after external code runs.
 *
 * **Example** (Measuring a view with a shadowed length)
 *
 * ```ts import.meta.vitest
 * import { Bytes, Result } from "effect"
 *
 * const bytes = new Uint8Array([10, 20, 30, 40])
 * Object.defineProperty(bytes, "length", { value: 99 })
 *
 * Result.getOrThrow(Bytes.byteLength(bytes)) // => 4
 * Result.getOrThrow(Bytes.byteLength(bytes.subarray(1, 3))) // => 2
 * ```
 *
 * @see {@link ByteViewError} for invalid-view reasons
 * @stability unstable
 * @category getters
 * @since 4.1.0
 */
export const byteLength = (input: unknown): Result.Result<number, ByteViewError> => {
  let reason: ByteViewError["reason"] = "InvalidInput"
  return Result.flatMap(
    Result.try({
      try: () => {
        if (!(input instanceof Uint8Array)) return Result.fail(new ByteViewError({ reason }))
        const buffer = Reflect.get(Uint8Array.prototype, "buffer", input)
        reason = "SharedBuffer"
        Reflect.get(ArrayBuffer.prototype, "byteLength", buffer)
        reason = "DetachedBuffer"
        const attached = new Uint8Array(buffer, 0, 0)
        reason = "OutOfBounds"
        // A zero-byte set validates view bounds even when byteLength would report zero.
        Uint8Array.prototype.set.call(input, attached)
        const length: number = Reflect.get(Uint8Array.prototype, "byteLength", input)
        return Result.succeed(length)
      },
      catch: () => new ByteViewError({ reason })
    }),
    identity
  )
}

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
