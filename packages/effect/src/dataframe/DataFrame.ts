/**
 * Typed, columnar tables: the values queries read and produce.
 *
 * **Mental model**
 *
 * - A `DataFrame<Row>` is an immutable table whose rows have type `Row`,
 *   stored column by column in Arrow layouts (typed arrays, UTF-8 bytes).
 *   Frames convert to and from `effect/arrow` tables without copying where
 *   the layouts agree.
 * - Frames are built from rows, columns or Arrow tables, inspected, compared
 *   and converted back to rows. Transforming them is the job of `Query`:
 *   `Query.from(frame)` starts a lazy query, and running it produces a new
 *   frame.
 * - Missing values are `null`. A nullable column's row type includes `null`.
 *
 * **Example** (Building and reading a frame)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { DataFrame } from "effect/dataframe"
 *
 * const Reading = Schema.Struct({ city: Schema.String, temp: Schema.NullOr(Schema.Number) })
 * const readings = DataFrame.fromRows(Reading, [
 *   { city: "Vienna", temp: 21.5 },
 *   { city: "Berlin", temp: null }
 * ])
 *
 * readings.length // => 2
 * DataFrame.columnNames(readings) // => ["city", "temp"]
 * DataFrame.toArray(readings, "temp") // => [21.5, null]
 * ```
 *
 * **Gotchas**
 *
 * - Row objects ({@link toRows}, iteration) map values as `effect/arrow`
 *   does: 64-bit integers are `bigint`, timestamps `DateTime`.
 *
 * @stability experimental
 * @since 4.1.5
 */
import type * as ArrowColumn from "../arrow/ArrowColumn.ts"
import * as ArrowData from "../arrow/ArrowData.ts"
import * as ArrowIpc from "../arrow/ArrowIpc.ts"
import * as ArrowSchema from "../arrow/ArrowSchema.ts"
import * as ArrowTable from "../arrow/ArrowTable.ts"
import type * as BigDecimal from "../BigDecimal.ts"
import * as Data from "../Data.ts"
import * as DateTime from "../DateTime.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import type * as Equal from "../Equal.ts"
import { dual } from "../Function.ts"
import type { Inspectable } from "../Inspectable.ts"
import type { Pipeable } from "../Pipeable.ts"
import * as Result from "../Result.ts"
import * as Stream from "../Stream.ts"
import type * as Types from "../Types.ts"
import * as F from "./internal/frame.ts"
import * as Schema_ from "./internal/schema.ts"
import * as T from "./internal/table.ts"
import * as V from "./internal/vector.ts"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * Identifies values of this module's main type.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.5
 */
export const TypeId: "~effect/dataframe/DataFrame" = F.TypeId

/**
 * A table whose rows have type `Row`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface DataFrame<out Row> extends Pipeable, Inspectable, Equal.Equal, Iterable<Row> {
  readonly [TypeId]: {
    readonly _Row: Types.Covariant<Row>
  }
  /** The number of rows. */
  readonly length: number
  /** The column names and their Arrow types. */
  readonly schema: ArrowSchema.Schema
}

/**
 * The row type of a frame.
 *
 * @stability experimental
 * @category type-level
 * @since 4.1.5
 */
export type Row<F> = F extends DataFrame<infer R> ? R : never

/**
 * The rows a frame holds for rows of type `T`: optional fields become
 * required and `undefined` becomes `null`, in nested structs and lists
 * too, as frames store a missing value as `null`.
 *
 * @stability experimental
 * @category type-level
 * @since 4.1.5
 */
export type Normalize<T> = {
  readonly [K in keyof T]-?: NormalizeValue<T[K]> | ({} extends Pick<T, K> ? null : never)
}

type Simplify<A> = { readonly [K in keyof A]: A[K] } extends infer B ? B : never

type StructSchema = { readonly Type: object; readonly ast: any }

type TypeOptions<S extends StructSchema> = {
  readonly types?: { readonly [K in keyof S["Type"]]?: ArrowSchema.DataType } | undefined
}

type NormalizeValue<A> = A extends undefined ? null
  : A extends BigDecimal.BigDecimal | DateTime.DateTime | Duration.Duration | Uint8Array ? A
  : A extends Array<infer E> ? Array<NormalizeValue<E>>
  : A extends ReadonlyArray<infer E> ? ReadonlyArray<NormalizeValue<E>>
  : A extends object ? Normalize<A>
  : A

/**
 * Raised for invalid input that the types can't rule out (a row that doesn't
 * match its schema, an Arrow table whose columns don't match a schema, a
 * column type frames can't hold), and by queries that fail when they run.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class DataFrameError extends Data.TaggedError("DataFrameError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

const fromDefect = (cause: unknown): DataFrameError =>
  new DataFrameError({ message: cause instanceof Error ? cause.message : String(cause), cause })

const unsafe = <A>(f: () => A): A => {
  try {
    return f()
  } catch (cause) {
    throw cause instanceof V.DataFrameDefect ? fromDefect(cause) : cause
  }
}

const frame = <R>(self: DataFrame<R>): F.Frame => self as unknown as F.Frame
const wrap = <R>(f: F.Frame): DataFrame<R> => f as unknown as DataFrame<R>

/**
 * Returns `true` for data frames.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isDataFrame = (u: unknown): u is DataFrame<unknown> => F.isFrame(u)

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * Builds a frame from rows described by a struct schema. Column types come
 * from the schema's fields: `String` is Utf8, `Number` is Float64,
 * `Boolean` is Bool, `BigInt` is Int64, `DateTimeUtc` and `Duration`
 * are microsecond timestamps and durations, arrays are lists, structs are
 * structs, and `NullOr`/optional fields are nullable. `options.types`
 * overrides the Arrow type of individual columns (for example
 * `ArrowSchema.int32`); `BigDecimal` fields need one, with the decimal's
 * precision and scale.
 *
 * **Details**
 *
 * The rows are decoded values (the schema's `Type`). The schema describes
 * them and is not run as a decoder. Its refinements, literals and enums are
 * tested on the value of every field that has them (inside structs, arrays
 * and union members too), and a struct's own checks
 * (`Schema.Struct(...).check(...)`) on every row, so the frame holds only
 * rows that {@link validate} accepts. Fields without them are stored without
 * further work.
 *
 * Missing values read back as `null` (see {@link Normalize}). An override
 * must hold its field's values, as {@link validate} checks columns: a
 * `DateTimeUtc` override is a timestamp without a time zone or with a UTC
 * one, which the frame drops.
 *
 * Throws a {@link DataFrameError} when a value doesn't fit its column or
 * fails a check of the schema, an override can't hold its field's values,
 * or the schema has no column types.
 *
 * **Gotchas**
 *
 * - A schema that transforms its rows is rejected, as frames hold decoded
 *   values and run no transformation: `Schema.NumberFromString`,
 *   `Schema.decodeTo`, decoding defaults, renamed keys. Pass
 *   `Schema.toType(schema)` to describe the decoded rows of such a schema.
 * - Tuples, records, classes, `DateTimeZoned`, unions of different column
 *   types and recursive schemas have no column type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromRows = <S extends StructSchema>(
  schema: S,
  rows: Iterable<S["Type"]>,
  options?: TypeOptions<S>
): DataFrame<Normalize<S["Type"]>> =>
  unsafe(() => {
    const { checks, columns } = Schema_.declare(schema, options?.types as any)
    const input: ReadonlyArray<any> = Array.isArray(rows) ? rows : Array.from(rows)
    const table = Result.getOrThrowWith(ArrowTable.fromRows(T.toArrowSchema(columns), input), fromDefect)
    // The rows are values already: test them as given instead of reading them back from the frame.
    if (checks !== undefined) T.runChecks(checks, (name) => input.map((row) => row[name]), () => input)
    return wrap(F.fromArrowTable(table))
  })

type ColumnInput =
  | Float64Array
  | Float32Array
  | Int32Array
  | Int16Array
  | Int8Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | BigInt64Array
  | BigUint64Array
  | ReadonlyArray<unknown>

type ColumnValue<C> = C extends BigInt64Array | BigUint64Array ? bigint
  : C extends ArrayBufferView ? number
  : C extends ReadonlyArray<infer A> ? A
  : never

const typedArrayTypes: ReadonlyArray<readonly [Function, ArrowSchema.DataType]> = [
  [Float64Array, ArrowSchema.float64],
  [Float32Array, ArrowSchema.float32],
  [Int32Array, ArrowSchema.int32],
  [Int16Array, ArrowSchema.int16],
  [Int8Array, ArrowSchema.int8],
  [Uint32Array, ArrowSchema.uint32],
  [Uint16Array, ArrowSchema.uint16],
  [Uint8Array, ArrowSchema.uint8],
  [BigInt64Array, ArrowSchema.int64],
  [BigUint64Array, ArrowSchema.uint64]
]

const inferType = (values: ReadonlyArray<unknown>): ArrowSchema.DataType => {
  for (const v of values) {
    switch (typeof v) {
      case "number":
        return ArrowSchema.float64
      case "string":
        return ArrowSchema.utf8
      case "boolean":
        return ArrowSchema.bool
      case "bigint":
        return ArrowSchema.int64
      case "object":
        if (DateTime.isDateTime(v)) return ArrowSchema.timestamp("microsecond")
        if (Duration.isDuration(v)) return ArrowSchema.duration("microsecond")
        if (v !== null) return V.fail(`cannot infer a column type for ${String(v)}: use fromRows with a schema`)
    }
  }
  return ArrowSchema.nullType
}

/**
 * Builds a frame from columns. Typed arrays keep their element type
 * (`Int32Array` is Int32, `Float64Array` is Float64, …) and are used without
 * copying where possible; arrays infer their type from their values
 * (`number` is Float64, `string` Utf8, `boolean` Bool, `bigint` Int64,
 * `DateTime` a microsecond timestamp, `Duration` a microsecond duration) and
 * use `null` for missing values.
 *
 * **Details**
 *
 * Throws a {@link DataFrameError} when columns have different lengths or an
 * array mixes value types.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromColumns = <C extends { readonly [name: string]: ColumnInput }>(
  columns: C
): DataFrame<Simplify<{ [K in keyof C]: ColumnValue<C[K]> }>> =>
  unsafe(() => {
    const names = Object.keys(columns)
    const types = names.map((name) => {
      const c = columns[name]
      return ArrayBuffer.isView(c)
        ? typedArrayTypes.find(([ctor]) => c instanceof ctor)![1]
        : inferType(c as ReadonlyArray<unknown>)
    })
    const lengths = new Set(names.map((n) => columns[n].length))
    if (lengths.size > 1) V.fail(`columns have different lengths: ${[...lengths].join(", ")}`)
    const length = names.length === 0 ? 0 : columns[names[0]].length
    const vectors = names.map((name, i) => {
      const c = columns[name]
      if (ArrayBuffer.isView(c)) {
        const bytes = new Uint8Array(c.buffer, c.byteOffset, c.byteLength)
        return V.fromArrowData(ArrowData.make({ type: types[i], length: c.length, buffers: [bytes] }))
      }
      const schema = ArrowSchema.make([ArrowSchema.field(name, types[i])])
      const table = Result.getOrThrowWith(ArrowTable.fromColumns(schema, [c]), fromDefect)
      return F.fromArrowTable(table).columns[0].vector
    })
    return wrap(F.fromVectors(names, vectors, length))
  })

/**
 * A frame over an Arrow table, with untyped rows. Use {@link validate} to
 * check it against a schema and recover the row type.
 *
 * **Details**
 *
 * Throws a {@link DataFrameError} for column types frames can't hold, such
 * as Float16, intervals, maps, unions, or decimals beyond 18 digits.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromArrowTable = (table: ArrowTable.Table): DataFrame<{ readonly [name: string]: unknown }> =>
  unsafe(() => wrap(F.fromArrowTable(table)))

/**
 * A frame over one Arrow record batch, with untyped rows.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromRecordBatch = (batch: ArrowTable.RecordBatch): DataFrame<{ readonly [name: string]: unknown }> =>
  fromArrowTable(ArrowTable.make(batch.schema, [batch]))

/**
 * Decodes Arrow IPC stream bytes (from a file, a socket or Arrow Flight)
 * into a stream of frames, one per record batch, ready to be a streamed
 * `Catalog` table.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const decodeArrowStream = <E, R>(
  bytes: Stream.Stream<Uint8Array, E, R>
): Stream.Stream<DataFrame<{ readonly [name: string]: unknown }>, DataFrameError | E, R> =>
  bytes.pipe(
    Stream.pipeThroughChannel(ArrowIpc.decode<E>()),
    Stream.mapError((error) =>
      ArrowIpc.isArrowIpcError(error) ? new DataFrameError({ message: error.message, cause: error }) : error as E
    ),
    Stream.mapEffect((batch) =>
      Effect.try({
        try: () => fromRecordBatch(batch),
        catch: (cause) => cause instanceof DataFrameError ? cause : fromDefect(cause)
      })
    )
  )

/**
 * An empty frame with the columns of a struct schema, typed as in
 * {@link fromRows}, which also describes `options.types`.
 *
 * **Gotchas**
 *
 * Throws a {@link DataFrameError} for the schemas {@link fromRows} rejects:
 * one that transforms its rows, or has fields without a column type.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const empty = <S extends StructSchema>(
  schema: S,
  options?: TypeOptions<S>
): DataFrame<Normalize<S["Type"]>> => fromRows(schema, [], options)

/**
 * Checks that a frame has the columns a struct schema or an Arrow schema
 * declares, with compatible types, and returns it with only those columns,
 * in the declared order, converted to the declared types.
 *
 * **Details**
 *
 * A struct schema declares the columns {@link fromRows} gives its fields
 * (`options.types` overrides some, and `BigDecimal` fields need one), and
 * the result is typed by it. A column is compatible when its values read
 * back as the field's: `Number` takes floats and integers below 64 bits,
 * `BigInt` takes 64-bit integers, `BigDecimal` takes decimals of any
 * precision and scale, `DateTimeUtc` and `Duration` take timestamps and
 * durations in any unit, and structs and arrays need compatible fields and
 * items. Every value must convert to the declared type exactly: a decimal
 * with more digits than the declared scale, or a timestamp finer than the
 * declared unit, fails.
 *
 * The types are checked and converted on the typed columns, without reading
 * values. A field the schema constrains further (literals, enums,
 * refinements, including inside structs, arrays and union members) has its
 * values read and tested one by one, and a struct with checks of its own
 * (`Schema.Struct(...).check(...)`) has every row read and tested. The
 * schema is not run as a decoder: one that transforms its rows fails, as in
 * {@link fromRows}.
 *
 * An Arrow schema declares its fields as they are: type, nullability,
 * nested fields, decimal precision and scale, and time unit. The result has
 * untyped rows, and no values are tested beyond their column type. The
 * fields can be `Null` (nullable), `Bool`, integers of any width, `Float32`,
 * `Float64`, `Utf8`, `Binary`, `Date` in days, `Time` in microseconds,
 * `Timestamp` and `Duration` in any unit, 128-bit `Decimal`, and `List`
 * and `Struct` of these. Other Arrow types fail: frames can't hold some
 * (`Float16`, intervals, maps, unions) and hold others as one of the types
 * above, which is the type to declare (`Utf8` for `LargeUtf8` and
 * `Utf8View`, `List` for `LargeList`, the value type for a dictionary). A
 * list's item field is named `item` in the result. Dates in milliseconds
 * and times in other units convert to the declared days and microseconds.
 *
 * **Gotchas**
 *
 * `DateTimeUtc` fields and Arrow timestamps take timestamps without a time
 * zone, or with a UTC one (`UTC`, `Etc/UTC`, `+00:00`), which the result
 * drops; other time zones, and values outside the range `DateTime`
 * represents, fail. `DateTimeZoned` fields are not supported: read zoned
 * timestamps from an untyped frame, where they are `DateTime.Zoned` values.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const validate: {
  <S extends StructSchema>(
    schema: S,
    options?: TypeOptions<S>
  ): <R>(self: DataFrame<R>) => Result.Result<DataFrame<Normalize<S["Type"]>>, DataFrameError>
  (
    schema: ArrowSchema.Schema
  ): <R>(self: DataFrame<R>) => Result.Result<DataFrame<{ readonly [name: string]: unknown }>, DataFrameError>
  <R, S extends StructSchema>(
    self: DataFrame<R>,
    schema: S,
    options?: TypeOptions<S>
  ): Result.Result<DataFrame<Normalize<S["Type"]>>, DataFrameError>
  <R>(
    self: DataFrame<R>,
    schema: ArrowSchema.Schema
  ): Result.Result<DataFrame<{ readonly [name: string]: unknown }>, DataFrameError>
} = dual((args) => isDataFrame(args[0]), (
  self: DataFrame<unknown>,
  schema: { readonly ast: any } | ArrowSchema.Schema,
  options?: { readonly types?: { readonly [name: string]: ArrowSchema.DataType | undefined } | undefined }
) =>
  Result.try({
    try: () => {
      const { checks, columns } = Schema_.declare(schema, options?.types)
      return wrap(T.conform(frame(self), columns, checks))
    },
    catch: fromDefect
  }))

// -----------------------------------------------------------------------------
// Conversions
// -----------------------------------------------------------------------------

/**
 * The rows as plain objects.
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const toRows = <R>(self: DataFrame<R>): Array<R> => F.toRows(frame(self))

/**
 * The values of one column.
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const toArray: {
  <R, K extends keyof R & string>(name: K): (self: DataFrame<R>) => Array<R[K]>
  <R, K extends keyof R & string>(self: DataFrame<R>, name: K): Array<R[K]>
} = dual(2, (self: DataFrame<unknown>, name: string) => F.toArray(frame(self), name)) as any

/**
 * One column as an Arrow column, without building rows or values.
 *
 * **When to use**
 *
 * Use to read or compute over a column's stored numbers, or to read single
 * values, without paying for a row object or a `DateTime`, `Duration` or
 * `BigDecimal` per value.
 *
 * **Details**
 *
 * The column has one chunk, laid out as {@link toArrowTable} lays it out:
 * its type, validity bitmap, buffers and child arrays are those of the
 * Arrow table, and share the frame's memory where the layouts agree.
 * `ArrowData.values` and `ArrowData.offsets` give its numbers and slot
 * boundaries as typed arrays, with timestamps, dates and durations as the
 * integers they are stored as, in the unit of the column's type.
 * `ArrowColumn.get`, `ArrowColumn.toArray` and iteration build values
 * as {@link toArray} does, typed by the frame's rows, one at a time.
 *
 * **Gotchas**
 *
 * - The typed array to expect follows from the column's Arrow type
 *   (`self.schema`), not from the row type: a `number` column can be
 *   `Int32` or `Float64`.
 * - Treat the buffers as read-only: they can be the frame's own.
 * - Frames hold dictionary-encoded and chunked input as one plain array per
 *   column, so the column has no dictionary and a single chunk.
 *
 * **Example** (Reading timestamps as stored)
 *
 * ```ts import.meta.vitest
 * import { DateTime, Option, Schema } from "effect"
 * import { ArrowColumn, ArrowData } from "effect/arrow"
 * import { DataFrame } from "effect/dataframe"
 *
 * const Event = Schema.Struct({ at: Schema.NullOr(Schema.DateTimeUtc) })
 * const events = DataFrame.fromRows(Event, [{ at: DateTime.makeUnsafe(1500) }, { at: null }])
 *
 * const at = DataFrame.column(events, "at")
 * const micros = Option.getOrThrow(ArrowData.values(at.chunks[0]))
 * micros[0] // => 1500000n
 * ArrowData.isValid(at.chunks[0], 1) // => false
 * ArrowColumn.getUnsafe(at, 0) // => DateTime.makeUnsafe(1500)
 * ```
 *
 * @see {@link toArray} for the values of a column as an array
 * @see {@link toArrowTable} for every column as one record batch
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const column: {
  <R, K extends keyof R & string>(name: K): (self: DataFrame<R>) => ArrowColumn.ArrowColumn<Exclude<R[K], null>>
  <R, K extends keyof R & string>(self: DataFrame<R>, name: K): ArrowColumn.ArrowColumn<Exclude<R[K], null>>
} = dual(
  2,
  (self: DataFrame<unknown>, name: string) => unsafe(() => F.toArrowColumn(frame(self), name))
) as any

/**
 * The frame as an Arrow table with one record batch.
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const toArrowTable = <R>(self: DataFrame<R>): ArrowTable.Table => F.toArrowTable(frame(self))

/**
 * The column names, in order.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.5
 */
export const columnNames = <R>(self: DataFrame<R>): Array<keyof R & string> =>
  frame(self).columns.map((c) => c.name) as Array<keyof R & string>

/**
 * A text table of the frame (its first and last rows when it is long).
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const format = <R>(self: DataFrame<R>, options?: { readonly maxRows?: number | undefined }): string =>
  F.render(frame(self), options?.maxRows ?? 10)

/**
 * Whether two frames have the same columns (names and types) and values.
 * `NaN` equals `NaN`.
 *
 * @stability experimental
 * @category equivalence
 * @since 4.1.5
 */
export const equals: {
  <R>(that: DataFrame<R>): (self: DataFrame<R>) => boolean
  <R>(self: DataFrame<R>, that: DataFrame<R>): boolean
} = dual(2, <R>(self: DataFrame<R>, that: DataFrame<R>) => F.equals(frame(self), frame(that)))
