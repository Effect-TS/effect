/**
 * Columns: one field's values across all batches of a table, read as
 * JavaScript values.
 *
 * **Mental model**
 *
 * - A column is a field plus one {@link ArrowData.ArrowData} chunk per record
 *   batch. {@link get} finds the chunk and reads the slot; nothing is decoded
 *   up front. Iterating reads every slot in order.
 * - Null slots read as `null`.
 *
 * **Details**
 *
 * Values map as follows:
 *
 * | Arrow type | Value |
 * | --- | --- |
 * | `Null` | `null` |
 * | `Bool` | `boolean` |
 * | `Int` 8–32 bits, `Float` | `number` |
 * | `Int` 64 bits | `bigint` |
 * | `Decimal` | `BigDecimal` |
 * | `Date`, `Timestamp` | `DateTime.Utc`, or `DateTime.Zoned` for timestamps with a time zone |
 * | `Time` | the time of day in its unit: `number` (32-bit) or `bigint` (64-bit) |
 * | `Duration` | `Duration` |
 * | `Interval` | `{ months }`, `{ days, milliseconds }` or `{ months, days, nanoseconds }` |
 * | `Binary`, `LargeBinary`, `BinaryView`, `FixedSizeBinary` | `Uint8Array` (a view, not a copy) |
 * | `Utf8`, `LargeUtf8`, `Utf8View` | `string` |
 * | `List`, `LargeList`, `ListView`, `LargeListView`, `FixedSizeList` | an array of item values |
 * | `Struct` | an object with one property per member |
 * | `Map` | a `ReadonlyMap` |
 * | `Union` | the value of the active member |
 * | `RunEndEncoded`, `Dictionary` | the decoded value |
 *
 * **Gotchas**
 *
 * - `DateTime` has millisecond precision: microsecond and nanosecond
 *   timestamps are rounded down to the millisecond. The exact value is in the
 *   column's buffers.
 * - Timestamps without a time zone are read as UTC.
 * - A struct with repeated member names keeps the last member of each name.
 * - Invalid UTF-8 reads as U+FFFD.
 *
 * **Building**
 *
 * {@link fromValues} (and `ArrowTable.fromRows` / `fromColumns`) accept the
 * same values the readers return, with these additions:
 *
 * - `null` and `undefined` both mean a null slot.
 * - Integer types accept `number` or `bigint`, range-checked.
 * - `Date`, `Timestamp`, `Time` and `Duration` also accept the raw integer in
 *   the type's unit (`number` or `bigint`), which keeps full precision.
 * - `Struct` also accepts an array of member values by position, for structs
 *   with repeated member names.
 * - `Map` also accepts an iterable of `[key, value]` entries.
 * - A `Union` value goes to the first member whose type accepts it; use
 *   {@link unionValue} to choose the member.
 * - `Decimal` values must fit the type's scale without rounding and its bit
 *   width; the precision is not enforced, as in the reference implementations.
 *
 * **Example** (Building and reading a column)
 *
 * ```ts import.meta.vitest
 * import { ArrowColumn, ArrowSchema } from "effect/arrow"
 * import { Option, Result } from "effect"
 *
 * const field = ArrowSchema.field("tags", ArrowSchema.list(ArrowSchema.field("item", ArrowSchema.utf8)))
 * const column = Result.getOrThrow(ArrowColumn.fromValues(field, [["a", "b"], null, []]))
 *
 * ArrowColumn.toArray(column) // => [["a", "b"], null, []]
 * ArrowColumn.get(column, 1) // => Option.some(null)
 * ArrowColumn.get(column, 3) // => Option.none()
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Data from "../Data.ts"
import { dual } from "../Function.ts"
import * as Option from "../Option.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"
import type * as ArrowData from "./ArrowData.ts"
import type * as ArrowExtension from "./ArrowExtension.ts"
import type * as ArrowSchema from "./ArrowSchema.ts"
import * as Builders from "./internal/builders.ts"
import { Column } from "./internal/column.ts"
import * as Values from "./internal/values.ts"

/**
 * One field's values across the chunks of a table. Iterating yields every
 * value in order; null slots yield `null`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ArrowColumn extends Iterable<unknown> {
  readonly field: ArrowSchema.Field
  readonly chunks: ReadonlyArray<ArrowData.ArrowData>
  readonly length: number
}

/**
 * Options for reading and building values.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Options {
  /** Extensions that decode (when reading) and encode (when building) the storage values of extension fields. */
  readonly extensions?: Iterable<ArrowExtension.ArrowExtension<any, any>> | undefined
}

/**
 * Creates a column from a field and its chunks.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = (
  field: ArrowSchema.Field,
  chunks: ReadonlyArray<ArrowData.ArrowData>,
  options?: Options
): ArrowColumn => new Column(field, chunks, Values.options(options))

const column = (self: ArrowColumn): Column =>
  self instanceof Column ? self : new Column(self.field, self.chunks, Values.options(undefined))

/**
 * The value at `index`: `Option.some(null)` for a null slot, `Option.none()`
 * outside `0 <= index < length`.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.5
 */
export const get: {
  (index: number): (self: ArrowColumn) => Option.Option<unknown>
  (self: ArrowColumn, index: number): Option.Option<unknown>
} = dual(
  2,
  (self: ArrowColumn, index: number): Option.Option<unknown> =>
    index >= 0 && index < self.length && Number.isInteger(index) ? Option.some(column(self).read(index)) : Option.none()
)

/**
 * The value at `index`, or `null` for a null slot.
 *
 * **Gotchas**
 *
 * - Throws a `RangeError` outside `0 <= index < length`.
 *
 * @stability experimental
 * @category unsafe
 * @since 4.1.5
 */
export const getUnsafe: {
  (index: number): (self: ArrowColumn) => unknown
  (self: ArrowColumn, index: number): unknown
} = dual(2, (self: ArrowColumn, index: number): unknown => {
  if (!(index >= 0 && index < self.length && Number.isInteger(index))) {
    throw new RangeError(`index ${index} is outside 0..${self.length}`)
  }
  return column(self).read(index)
})

/**
 * Reads every value of a column into an array.
 *
 * @stability experimental
 * @category converting
 * @since 4.1.5
 */
export const toArray = (self: ArrowColumn): Array<unknown> => {
  const out = new Array<unknown>(self.length)
  let i = 0
  for (const v of self) out[i++] = v
  return out
}

const ArrowBuildErrorTypeId = "~effect/arrow/ArrowColumn/ArrowBuildError"

/**
 * The error returned when values cannot be stored in a field: a value of the
 * wrong kind, out of range, or null in a non-nullable field. `path` locates
 * the value (row index, member names, …).
 *
 * **Example** (A value out of range)
 *
 * ```ts import.meta.vitest
 * import { ArrowColumn, ArrowSchema } from "effect/arrow"
 * import { Result } from "effect"
 *
 * const result = ArrowColumn.fromValues(ArrowSchema.field("n", ArrowSchema.int8), [1, 300])
 *
 * Result.isFailure(result) && result.failure.path // => [1]
 * ```
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class ArrowBuildError extends Data.TaggedError("ArrowBuildError")<{
  readonly message: string
  readonly path: ReadonlyArray<string | number>
}> {
  /**
   * Marks this value as an `ArrowBuildError` for {@link isArrowBuildError}.
   *
   * @since 4.1.5
   */
  readonly [ArrowBuildErrorTypeId] = ArrowBuildErrorTypeId
}

/**
 * Returns `true` when the value is an {@link ArrowBuildError}.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isArrowBuildError = (u: unknown): u is ArrowBuildError => Predicate.hasProperty(u, ArrowBuildErrorTypeId)

/**
 * Builds a single-chunk column of `field` from values. See "Building" above
 * for the accepted values.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromValues = (
  field: ArrowSchema.Field,
  values: Iterable<unknown>,
  options?: Options
): Result.Result<ArrowColumn, ArrowBuildError> => {
  try {
    const session = Builders.session(Values.options(options))
    const data = Builders.finish(
      Builders.build(field, Array.isArray(values) ? values : Array.from(values), session),
      session
    )
    return Result.succeed(make(field, [data], options))
  } catch (e) {
    if (e instanceof Builders.BuildFailure) {
      return Result.fail(new ArrowBuildError({ message: e.message, path: e.path }))
    }
    throw e
  }
}

/**
 * A value for a union field, tagged with the type id of the member it
 * belongs to.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface UnionValue<A> {
  readonly _tag: "UnionValue"
  readonly typeId: number
  readonly value: A
}

/**
 * Creates a {@link UnionValue}, which puts `value` into the union member with
 * type id `typeId` when building.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const unionValue = <A>(typeId: number, value: A): UnionValue<A> => ({ _tag: "UnionValue", typeId, value })

/**
 * Returns `true` when the value is a {@link UnionValue}.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isUnionValue = (u: unknown): u is UnionValue<unknown> => Predicate.isTagged(u, "UnionValue")
