/**
 * The physical layout of one Arrow array: its type, length, validity bitmap,
 * data buffers and children, exactly as the columnar format defines them.
 *
 * **Mental model**
 *
 * - `ArrowData` is the low-level representation every other module builds on,
 *   like `ArrayData` in arrow-rs or `Data` in arrow-js. IPC reads produce it
 *   without copying: buffers are views into the input bytes.
 * - `validity` is a bitmap with one bit per slot (1 = valid), starting at bit
 *   `offset`. It is `undefined` when no slot is null.
 * - `buffers` hold the type's buffers after the validity bitmap, in the order
 *   of the columnar format: values for fixed-width types, offsets and data
 *   for `Binary`/`Utf8`, views then data buffers for view types, offsets for
 *   lists, offsets and sizes for list views, type ids (and offsets) for
 *   unions, indices for dictionaries. `Null`, `Struct`, `FixedSizeList` and
 *   `RunEndEncoded` have none.
 * - Nested types keep their children in `children`, in the order of the
 *   type's child fields. Dictionary-encoded arrays keep their dictionary
 *   values in `dictionary`.
 * - Buffers are plain bytes (`Uint8Array`) because IPC input may place them at
 *   any byte offset. {@link values} and {@link offsets} give typed views of
 *   them with the array's `offset` and `length` applied.
 * - {@link slice} is free: it only moves `offset` and `length`. Writers copy
 *   what a slice needs when they serialise it.
 *
 * @stability experimental
 * @since 4.1.5
 */
import { dual } from "../Function.ts"
import * as Option from "../Option.ts"
import type * as ArrowSchema from "./ArrowSchema.ts"
import * as Layout from "./internal/layout.ts"

/**
 * One Arrow array in its physical layout.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ArrowData {
  readonly type: ArrowSchema.DataType
  readonly length: number
  /** Slot offset into the buffers. */
  readonly offset: number
  readonly nullCount: number
  readonly validity: Uint8Array | undefined
  readonly buffers: ReadonlyArray<Uint8Array>
  readonly children: ReadonlyArray<ArrowData>
  readonly dictionary: ArrowData | undefined
}

/**
 * Creates array data. Omitted parts default to no offset, no nulls, no
 * buffers and no children.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = (options: {
  readonly type: ArrowSchema.DataType
  readonly length: number
  readonly offset?: number | undefined
  readonly nullCount?: number | undefined
  readonly validity?: Uint8Array | undefined
  readonly buffers?: ReadonlyArray<Uint8Array> | undefined
  readonly children?: ReadonlyArray<ArrowData> | undefined
  readonly dictionary?: ArrowData | undefined
}): ArrowData => ({
  type: options.type,
  length: options.length,
  offset: options.offset ?? 0,
  nullCount: options.nullCount ?? 0,
  validity: options.validity,
  buffers: options.buffers ?? [],
  children: options.children ?? [],
  dictionary: options.dictionary
})

/**
 * Whether slot `index` holds a value. Union and run-end encoded arrays have no
 * validity of their own: their nulls come from their children.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.5
 */
export const isValid: {
  (index: number): (self: ArrowData) => boolean
  (self: ArrowData, index: number): boolean
} = dual(2, (self: ArrowData, index: number): boolean => {
  const validity = self.validity
  if (validity === undefined) return true
  const bit = self.offset + index
  return (validity[bit >> 3] & (1 << (bit & 7))) !== 0
})

/**
 * Slots `start` (inclusive) to `end` (exclusive) of `self`, like
 * `Array.prototype.slice`, without copying any buffer. `end` defaults to the
 * length.
 *
 * **Gotchas**
 *
 * - Throws a `RangeError` unless `0 <= start <= end <= length`.
 *
 * **Example** (Slicing a column)
 *
 * ```ts import.meta.vitest
 * import { ArrowColumn, ArrowData, ArrowSchema } from "effect/arrow"
 * import { Result } from "effect"
 *
 * const field = ArrowSchema.field("n", ArrowSchema.int32)
 * const [data] = Result.getOrThrow(ArrowColumn.fromValues(field, [1, 2, 3, 4])).chunks
 *
 * ArrowColumn.toArray(ArrowColumn.make(field, [ArrowData.slice(data, 1, 3)])) // => [2, 3]
 * ```
 *
 * @stability experimental
 * @category slicing
 * @since 4.1.5
 */
export const slice: {
  (start: number, end?: number): (self: ArrowData) => ArrowData
  (self: ArrowData, start: number, end?: number): ArrowData
} = dual(
  (args) => typeof args[0] === "object",
  (self: ArrowData, start: number, end?: number): ArrowData => Layout.slice(self, start, end ?? self.length)
)

/**
 * The typed arrays {@link values} returns.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Values =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | BigInt64Array
  | BigUint64Array
  | Float32Array
  | Float64Array

/**
 * Returns the slots of an array as a typed array, for the types that store
 * one fixed-width number per slot. Element `i` is slot `i`: the array's
 * `offset` and `length` are already applied.
 *
 * **When to use**
 *
 * Use to read or compute over a column without creating a value per slot, or
 * to read an integer exactly as stored, such as the nanoseconds of a
 * timestamp.
 *
 * **Details**
 *
 * | Arrow type | Typed array | Element |
 * | --- | --- | --- |
 * | `Int` | by width and sign, `Int8Array` to `BigUint64Array` | the integer |
 * | `Float` 32 and 64 bits | `Float32Array`, `Float64Array` | the number |
 * | `Date` | `Int32Array` (days), `BigInt64Array` (milliseconds) | days or milliseconds since 1970-01-01 |
 * | `Time` | `Int32Array` (32-bit), `BigInt64Array` (64-bit) | the time of day in the type's unit |
 * | `Timestamp`, `Duration` | `BigInt64Array` | the count in the type's unit |
 * | `Decimal` 32 and 64 bits | `Int32Array`, `BigInt64Array` | the unscaled value; the scale is on the type |
 * | `Interval` in year-months | `Int32Array` | months |
 * | `Dictionary` | by the index type | the index into `dictionary` |
 *
 * Every other type returns `Option.none()`: `Null`, `Bool` (a bitmap),
 * 16-bit floats, wider decimals, the other intervals, binary and string
 * types, nested types, unions and run-end encoded arrays. Read those from
 * `buffers` and `children`, laid out as the module documentation describes.
 *
 * **Gotchas**
 *
 * - Null slots hold unspecified numbers. Check them with {@link isValid}.
 * - Treat the result as read-only. It shares the array's memory when the
 *   buffer is aligned to the element size and is a copy otherwise, so a write
 *   may or may not reach the array.
 * - The buffer is not validated. Data made with {@link make} must hold at
 *   least `offset + length` elements.
 *
 * **Example** (Reading exact nanoseconds)
 *
 * ```ts import.meta.vitest
 * import { ArrowColumn, ArrowData, ArrowSchema } from "effect/arrow"
 * import { Option, Result } from "effect"
 *
 * const field = ArrowSchema.field("at", ArrowSchema.timestamp("nanosecond"))
 * const column = Result.getOrThrow(ArrowColumn.fromValues(field, [1704164645678901234n, null, 1n]))
 * const data = ArrowData.slice(column.chunks[0], 1)
 *
 * const nanos = Option.getOrThrow(ArrowData.values(data))
 * nanos instanceof BigInt64Array // => true
 * nanos.length // => 2
 * ArrowData.isValid(data, 0) // => false
 * nanos[1] // => 1n
 * ```
 *
 * @see {@link offsets} for the slot boundaries of variable-size types
 * @stability experimental
 * @category getters
 * @since 4.1.5
 */
export const values = (self: ArrowData): Option.Option<Values> => Option.fromUndefinedOr(Layout.values(self))

/**
 * Returns the offsets of an array of variable-size slots: `length + 1`
 * entries, where entries `i` and `i + 1` bound slot `i`. The array's
 * `offset` and `length` are already applied.
 *
 * **Details**
 *
 * - `Binary` and `Utf8` give an `Int32Array`, `LargeBinary` and `LargeUtf8`
 *   a `BigInt64Array`. The offsets are byte positions in `buffers[1]`.
 * - `List` and `Map` give an `Int32Array`, `LargeList` a `BigInt64Array`.
 *   The offsets are slots of `children[0]`: the items of a list, or the
 *   key and value entries of a map.
 * - Every other type returns `Option.none()`, including list views, which
 *   have an offset and a size per slot, and dense unions.
 *
 * **Gotchas**
 *
 * - The offsets of a slice do not start at 0.
 * - Treat the result as read-only. It shares the array's memory when the
 *   buffer is aligned to the element size and is a copy otherwise.
 *
 * **Example** (Finding the bytes of a string)
 *
 * ```ts import.meta.vitest
 * import { ArrowColumn, ArrowData, ArrowSchema } from "effect/arrow"
 * import { Option, Result } from "effect"
 *
 * const field = ArrowSchema.field("s", ArrowSchema.utf8)
 * const column = Result.getOrThrow(ArrowColumn.fromValues(field, ["a", "bc", ""]))
 * const data = ArrowData.slice(column.chunks[0], 1)
 *
 * const offsets = Option.getOrThrow(ArrowData.offsets(data))
 * Array.from(offsets) // => [1, 3, 3]
 * new TextDecoder().decode(data.buffers[1].subarray(Number(offsets[0]), Number(offsets[1]))) // => "bc"
 * ```
 *
 * @see {@link values} for the slots of fixed-width types
 * @stability experimental
 * @category getters
 * @since 4.1.5
 */
export const offsets = (self: ArrowData): Option.Option<Int32Array | BigInt64Array> =>
  Option.fromUndefinedOr(Layout.offsets(self))
