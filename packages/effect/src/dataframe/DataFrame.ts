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
import * as ArrowIpc from "../arrow/ArrowIpc.ts"
import * as ArrowSchema from "../arrow/ArrowSchema.ts"
import * as ArrowTable from "../arrow/ArrowTable.ts"
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

type Simplify<A> = { readonly [K in keyof A]: A[K] } extends infer B ? B : never

/**
 * Raised for invalid input that the types can't rule out: a row that doesn't
 * match its schema, an Arrow table whose columns don't match a schema, or a
 * column type the DataFrame doesn't support.
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
 * from the schema's type side: `String` is Utf8, `Number` is Float64,
 * `Boolean` is Bool, `BigInt` is Int64, and `NullOr`/optional fields are
 * nullable. `options.types` overrides the Arrow type of individual columns
 * (for example `ArrowSchema.int32`).
 *
 * **Details**
 *
 * Throws a {@link DataFrameError} when a value doesn't fit its column.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromRows = <S extends { readonly Type: object; readonly ast: any }>(
  schema: S,
  rows: Iterable<S["Type"]>,
  options?: { readonly types?: { readonly [K in keyof S["Type"]]?: ArrowSchema.DataType } | undefined }
): DataFrame<Simplify<S["Type"]>> =>
  unsafe(() => {
    const arrow = Schema_.toArrowSchema(schema, options?.types as any)
    const table = Result.getOrElse(
      ArrowTable.fromRows(arrow, Array.isArray(rows) ? rows : Array.from(rows) as any),
      (error) => {
        throw fromDefect(error)
      }
    )
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
    const fields: Array<ArrowSchema.Field> = []
    const data = names.map((name) => {
      const c = columns[name]
      if (ArrayBuffer.isView(c)) {
        const type = typedArrayTypes.find(([ctor]) => c instanceof ctor)![1]
        fields.push(ArrowSchema.field(name, type, { nullable: false }))
        const bytes = new Uint8Array(c.buffer, c.byteOffset, c.byteLength)
        return {
          type,
          length: (c as Float64Array).length,
          offset: 0,
          nullCount: 0,
          validity: undefined,
          buffers: [bytes],
          children: [],
          dictionary: undefined
        }
      }
      const type = inferType(c as ReadonlyArray<unknown>)
      fields.push(ArrowSchema.field(name, type))
      return undefined
    })
    const lengths = new Set(names.map((n) => (columns[n] as { length: number }).length))
    if (lengths.size > 1) V.fail(`columns have different lengths: ${[...lengths].join(", ")}`)
    const length = names.length === 0 ? 0 : (columns[names[0]] as { length: number }).length
    const vectors = names.map((name, i) => {
      const d = data[i]
      if (d !== undefined) return V.fromArrowData(d)
      const schema = ArrowSchema.make([fields[i]])
      const values = columns[name] as ReadonlyArray<unknown>
      const rows = values.map((v) => ({ [name]: v }))
      const table = Result.getOrElse(ArrowTable.fromRows(schema, rows), (error) => {
        throw fromDefect(error)
      })
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
 * Throws a {@link DataFrameError} for column types the DataFrame doesn't
 * support yet (decimals, nested types, intervals).
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
    Stream.mapEffect((batch) => {
      try {
        return Effect.succeed(fromRecordBatch(batch))
      } catch (cause) {
        return Effect.fail(cause instanceof DataFrameError ? cause : fromDefect(cause))
      }
    })
  )

/**
 * An empty frame with the columns of a struct schema.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const empty = <S extends { readonly Type: object; readonly ast: any }>(
  schema: S
): DataFrame<Simplify<S["Type"]>> => fromRows(schema, [])

/**
 * Checks that a frame has the columns of a struct schema, with compatible
 * types, and returns it typed (with only the schema's columns, in its
 * order). Integer columns are accepted for `Number` fields.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const validate: {
  <S extends { readonly Type: object; readonly ast: any }>(
    schema: S
  ): <R>(self: DataFrame<R>) => Result.Result<DataFrame<Simplify<S["Type"]>>, DataFrameError>
  <R, S extends { readonly Type: object; readonly ast: any }>(
    self: DataFrame<R>,
    schema: S
  ): Result.Result<DataFrame<Simplify<S["Type"]>>, DataFrameError>
} = dual(2, (self: DataFrame<unknown>, schema: { readonly ast: any }) => {
  try {
    const columns = Schema_.tableColumns(Schema_.toArrowSchema(schema, undefined))
    return Result.succeed(wrap(Schema_.conform(frame(self), columns)))
  } catch (cause) {
    return Result.fail(fromDefect(cause))
  }
})

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
