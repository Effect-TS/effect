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
 *   any byte offset; typed views are created by the readers that need them.
 * - {@link slice} is free: it only moves `offset` and `length`. Writers copy
 *   what a slice needs when they serialise it.
 *
 * @stability experimental
 * @since 4.1.5
 */
import { dual } from "../Function.ts"
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
