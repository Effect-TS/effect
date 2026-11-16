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
 * Readers return domain values unless {@link Options} asks for
 * `representation: "storage"`. Storage values are what the buffers hold:
 * an integer where the domain value is a `DateTime`, `Duration` or
 * `BigDecimal`, and the undecoded value of an extension field. Reading them
 * creates none of those objects and loses no precision. Values map as
 * follows, with the same representation inside lists, structs, maps, unions,
 * run-end encoded and dictionary values:
 *
 * | Arrow type | Domain value | Storage value |
 * | --- | --- | --- |
 * | `Null` | `null` | same |
 * | `Bool` | `boolean` | same |
 * | `Int` 8–32 bits, `Float` | `number` | same |
 * | `Int` 64 bits | `bigint` | same |
 * | `Decimal` | `BigDecimal` | the unscaled value as a `bigint`; the scale is on the type |
 * | `Date` | `DateTime.Utc` | days since 1970-01-01 as a `number`, or milliseconds as a `bigint` |
 * | `Timestamp` | `DateTime.Utc`, or `DateTime.Zoned` with a time zone | the count since 1970-01-01 in the type's unit, as a `bigint`; the time zone is on the type |
 * | `Time` | the time of day in its unit: `number` (32-bit) or `bigint` (64-bit) | same |
 * | `Duration` | `Duration` | the count in the type's unit, as a `bigint` |
 * | `Interval` | `{ months }`, `{ days, milliseconds }` or `{ months, days, nanoseconds }` | same |
 * | `Binary`, `LargeBinary`, `BinaryView`, `FixedSizeBinary` | `Uint8Array` (a view, not a copy) | same |
 * | `Utf8`, `LargeUtf8`, `Utf8View` | `string` | same |
 * | `List`, `LargeList`, `ListView`, `LargeListView`, `FixedSizeList` | an array of item values | same |
 * | `Struct` | an object with one property per member | same |
 * | `Map` | a `ReadonlyMap` | same |
 * | `Union` | the value of the active member | same |
 * | `RunEndEncoded`, `Dictionary` | the decoded value | same |
 * | extension field | what its registered extension decodes | the value of the field's type, not decoded |
 *
 * **Gotchas**
 *
 * - `DateTime` has millisecond precision: microsecond and nanosecond
 *   timestamps are rounded down to the millisecond. The storage value and
 *   `ArrowData.values` are exact.
 * - Timestamps without a time zone are read as UTC.
 * - A `Date` or `Timestamp` outside the range `DateTime` supports (about
 *   275,000 years either side of 1970) reads as its stored integer in the
 *   type's unit: a `number` for days, a `bigint` otherwise. Building accepts
 *   that integer back.
 * - An `Interval` is a calendar interval, not an elapsed time, and never
 *   reads as a `Duration`.
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
 * - List types also accept any iterable of items, and `Map` any iterable of
 *   `[key, value]` entries.
 * - A `Union` value goes to the first member whose type accepts it; use
 *   {@link unionValue} to choose the member.
 * - `Decimal` values must fit the type's scale without rounding and its bit
 *   width; the precision is not enforced, as in the reference implementations.
 *
 * Builders ignore `representation`. They take storage values back for every
 * type except two:
 *
 * - `Decimal` needs a `BigDecimal`. Make one from the unscaled value and the
 *   type's scale with `BigDecimal.make`.
 * - An extension given to a builder encodes every value of its fields. Leave
 *   it out of the builder's options to pass storage values through.
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
 * **Example** (Reading the stored nanoseconds of a timestamp column)
 *
 * ```ts import.meta.vitest
 * import { ArrowColumn, ArrowSchema } from "effect/arrow"
 * import { DateTime, Result } from "effect"
 *
 * const field = ArrowSchema.field("at", ArrowSchema.timestamp("nanosecond"))
 * const { chunks } = Result.getOrThrow(ArrowColumn.fromValues(field, [1704164645678901234n, null]))
 *
 * ArrowColumn.toArray(ArrowColumn.make(field, chunks)) // => [DateTime.makeUnsafe("2024-01-02T03:04:05.678Z"), null]
 * ArrowColumn.toArray(ArrowColumn.make(field, chunks, { representation: "storage" })) // => [1704164645678901234n, null]
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
import { Column, TypeId as ColumnTypeId } from "./internal/column.ts"
import * as Values from "./internal/values.ts"

const TypeId = ColumnTypeId

/**
 * One field's values across the chunks of a table. Iterating yields every
 * value in order; null slots yield `null`.
 *
 * **Details**
 *
 * `A` is the type of the non-null values. An Arrow type does not determine
 * it, so the constructors of this module return columns of `unknown` values.
 * Code that knows what a field reads as can give its columns a narrower `A`.
 *
 * Columns are opaque. {@link make}, {@link fromValues} and `ArrowTable.column`
 * create them, and every reader of a column returns the representation it was
 * made with. An object with the same properties is not a column.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ArrowColumn<out A = unknown> extends Iterable<A | null> {
  readonly [TypeId]: typeof TypeId
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
  /**
   * What the readers return: `"domain"` values such as `DateTime`, or the
   * `"storage"` values they are made from. Builders ignore it.
   *
   * @default "domain"
   */
  readonly representation?: "domain" | "storage" | undefined
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

/** The value at `index`, assuming `0 <= index < length`. Every `ArrowColumn` is a `Column`. */
const read = (self: ArrowColumn, index: number): unknown => (self as Column).read(index)

/**
 * The value at `index`: `Option.some(null)` for a null slot, `Option.none()`
 * outside `0 <= index < length`.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.5
 */
export const get: {
  (index: number): <A>(self: ArrowColumn<A>) => Option.Option<A | null>
  <A>(self: ArrowColumn<A>, index: number): Option.Option<A | null>
} = dual(
  2,
  (self: ArrowColumn, index: number): Option.Option<unknown> =>
    index >= 0 && index < self.length && Number.isInteger(index) ? Option.some(read(self, index)) : Option.none()
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
  (index: number): <A>(self: ArrowColumn<A>) => A | null
  <A>(self: ArrowColumn<A>, index: number): A | null
} = dual(2, (self: ArrowColumn, index: number): unknown => {
  if (!(index >= 0 && index < self.length && Number.isInteger(index))) {
    throw new RangeError(`index ${index} is outside 0..${self.length}`)
  }
  return read(self, index)
})

/**
 * Reads every value of a column into an array.
 *
 * @stability experimental
 * @category converting
 * @since 4.1.5
 */
export const toArray = <A>(self: ArrowColumn<A>): Array<A | null> => {
  const out = new Array<A | null>(self.length)
  let i = 0
  for (const v of self) out[i++] = v
  return out
}

const ArrowBuildErrorTypeId = "~effect/arrow/ArrowColumn/ArrowBuildError"

/**
 * The error returned when values cannot be stored in a field: a value of the
 * wrong kind, out of range, or null in a non-nullable field, or a field whose
 * type is invalid (union type codes, decimal precision or scale). `path`
 * locates the value from the top of the input: its index (for tables, its row
 * index and column name), then struct member names, list item indices and so
 * on. An invalid type is reported before any value, with an empty `path` for
 * a column and the column name for a table.
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
 *
 * const field = ArrowSchema.field("xs", ArrowSchema.list(ArrowSchema.field("item", ArrowSchema.int8)))
 * const nested = ArrowColumn.fromValues(field, [[1], [2, 300]])
 *
 * Result.isFailure(nested) && nested.failure.path // => [1, 1]
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
    Builders.checkType(field.type, [])
    const resolved = Values.options(options)
    const session = Builders.session(resolved)
    const data = Builders.finish(Builders.build(field, values, session, (i) => [i]), session)
    return Result.succeed(new Column(field, [data], resolved))
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
export const isUnionValue: (u: unknown) => u is UnionValue<unknown> = Builders.isUnionValue
