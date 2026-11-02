/**
 * Represents immutable POSIX byte-path spellings, including invalid UTF-8.
 * Slash is the only separator. Empty values, dots, repeated separators and
 * trailing separators are preserved. These values do not establish filesystem
 * validity or confinement, and do not provide Windows-native path semantics.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Bytes from "./Bytes.ts"
import * as Data from "./Data.ts"
import * as Equal from "./Equal.ts"
import * as Hash from "./Hash.ts"
import * as order from "./Order.ts"
import { type Pipeable, pipeArguments } from "./Pipeable.ts"
import * as Result from "./Result.ts"

const TypeId = "~effect/BytePath"

/**
 * An immutable, opaque POSIX byte-path spelling with no NUL bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface BytePath extends Equal.Equal, Pipeable {
  readonly [TypeId]: typeof TypeId
}

/**
 * Error returned when path construction or text conversion fails.
 *
 * **Details**
 *
 * Out-of-bounds resizable-buffer views use `InvalidInput`. Error precedence
 * for inputs violating multiple rules is unspecified.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class BytePathError extends Data.TaggedError("BytePathError")<{
  readonly reason: "NulByte" | "InvalidUtf16" | "InvalidUtf8" | "SharedBuffer" | "DetachedBuffer" | "InvalidInput"
  readonly message: string
}> {}

const byteViewErrors = {
  InvalidInput: { reason: "InvalidInput", message: "Expected a Uint8Array" },
  SharedBuffer: { reason: "SharedBuffer", message: "SharedArrayBuffer-backed paths are not supported" },
  DetachedBuffer: { reason: "DetachedBuffer", message: "The input buffer is detached" },
  OutOfBounds: { reason: "InvalidInput", message: "The Uint8Array view is out of bounds or cannot be copied" }
} as const

const registry = new WeakMap<object, Uint8Array<ArrayBuffer>>()

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

const bytes = (path: BytePath): Uint8Array<ArrayBuffer> => {
  const value = registry.get(path)
  if (value === undefined) throw new TypeError("Expected a genuine BytePath")
  return value
}

const Proto: BytePath = Object.freeze({
  [TypeId]: TypeId,
  [Equal.symbol](this: BytePath, that: unknown): boolean {
    return isBytePath(that) && Bytes.Equivalence(bytes(this), bytes(that))
  },
  [Hash.symbol](this: BytePath): number {
    return Hash.array(bytes(this))
  },
  pipe(this: BytePath) {
    return pipeArguments(this, arguments)
  }
})

const make = (value: Uint8Array<ArrayBuffer>): BytePath => {
  const path = Object.freeze(Object.create(Proto))
  registry.set(path, value)
  return path
}

/**
 * Checks whether a value was constructed by this copy of the BytePath module.
 *
 * @stability unstable
 * @category guards
 * @since 4.1.0
 */
export const isBytePath = (input: unknown): input is BytePath =>
  typeof input === "object" && input !== null && registry.has(input)

/**
 * Creates a path by immediately copying an attached, non-shared Uint8Array.
 *
 * **Details**
 *
 * Accepts same-realm Uint8Arrays, including empty arrays, subviews and Node
 * Buffers. Rejects NUL bytes, shared or detached buffers, out-of-bounds views
 * and non-Uint8Array input. Shadowed properties and custom iterators are ignored.
 *
 * **Example** (Preserving a non-UTF-8 filename)
 *
 * ```ts import.meta.vitest
 * import { BytePath, Result } from "effect"
 *
 * const path = Result.getOrThrow(BytePath.fromBytes(new Uint8Array([47, 255])))
 *
 * Array.from(BytePath.toBytes(path)) // => [47, 255]
 * Result.isFailure(BytePath.toString(path)) // => true
 * ```
 *
 * @see {@link toBytes} for exporting a copy of the path bytes
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const fromBytes = (input: Uint8Array): Result.Result<BytePath, BytePathError> => {
  if (!ArrayBuffer.isView(input) || !(input instanceof Uint8Array)) {
    return Result.fail(new BytePathError(byteViewErrors.InvalidInput))
  }
  return Result.gen(function*() {
    const length = yield* Result.mapError(
      Bytes.byteLength(input),
      (error) => new BytePathError(byteViewErrors[error.reason])
    )
    const copy = yield* Result.try({
      try: () => {
        const buffer = Reflect.get(Uint8Array.prototype, "buffer", input)
        const offset: number = Reflect.get(Uint8Array.prototype, "byteOffset", input)
        const copy = new Uint8Array(length)
        copy.set(new Uint8Array(buffer, offset, length))
        return copy
      },
      catch: () => new BytePathError(byteViewErrors.OutOfBounds)
    })
    if (copy.includes(0)) {
      return yield* Result.fail(new BytePathError({ reason: "NulByte", message: "BytePath cannot contain NUL bytes" }))
    }
    return make(copy)
  })
}

/**
 * Creates a path from well-formed UTF-16 text, preserving BOMs and Unicode
 * spelling without normalization. Rejects NUL and unpaired surrogates.
 *
 * @see {@link toString} for lossless UTF-8 decoding
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const fromString = (input: string): Result.Result<BytePath, BytePathError> => {
  if (typeof input !== "string") {
    return Result.fail(new BytePathError({ reason: "InvalidInput", message: "Expected a string" }))
  }
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    if (code === 0) {
      return Result.fail(new BytePathError({ reason: "NulByte", message: "BytePath cannot contain NUL bytes" }))
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = input.charCodeAt(++i)
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return Result.fail(new BytePathError({ reason: "InvalidUtf16", message: "Unpaired UTF-16 surrogate" }))
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return Result.fail(new BytePathError({ reason: "InvalidUtf16", message: "Unpaired UTF-16 surrogate" }))
    }
  }
  return Result.succeed(make(encoder.encode(input)))
}

/**
 * Returns a fresh mutable copy of the path bytes.
 *
 * @see {@link fromBytes} for validating and copying input bytes
 * @stability unstable
 * @category destructors
 * @since 4.1.0
 */
export const toBytes = (path: BytePath): Uint8Array<ArrayBuffer> => bytes(path).slice()

/**
 * Returns the exact number of path bytes without copying them.
 *
 * @stability unstable
 * @category getters
 * @since 4.1.0
 */
export const byteLength = (path: BytePath): number => bytes(path).byteLength

/**
 * Decodes a path as strict UTF-8, preserving a leading BOM. Returns
 * `InvalidUtf8` when the bytes have no lossless text representation.
 *
 * @see {@link fromString} for constructing paths from well-formed text
 * @stability unstable
 * @category destructors
 * @since 4.1.0
 */
export const toString = (path: BytePath): Result.Result<string, BytePathError> => {
  const value = bytes(path)
  return Result.try({
    try: () => decoder.decode(value),
    catch: () => new BytePathError({ reason: "InvalidUtf8", message: "BytePath contains invalid UTF-8" })
  })
}

/**
 * The empty byte-path spelling, which filesystem operations may reject.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.0
 */
export const empty: BytePath = make(new Uint8Array(0))

/**
 * Checks whether the first byte is a slash, without resolving the path.
 *
 * @stability unstable
 * @category predicates
 * @since 4.1.0
 */
export const isAbsolute = (path: BytePath): boolean => bytes(path)[0] === 0x2f

/**
 * Orders paths lexicographically by unsigned bytes, with shorter equal
 * prefixes first.
 *
 * @stability unstable
 * @category instances
 * @since 4.1.0
 */
export const Order: order.Order<BytePath> = order.mapInput(Bytes.Order, bytes)
