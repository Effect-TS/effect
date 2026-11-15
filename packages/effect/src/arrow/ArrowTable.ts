/**
 * Record batches and tables: a schema plus columns of equal length.
 *
 * **Mental model**
 *
 * - A {@link RecordBatch} is one chunk of rows: one {@link ArrowData.ArrowData}
 *   per schema field, all of the batch's length.
 * - A {@link Table} is a schema plus the batches that share it, in order. An
 *   IPC stream or file decodes to a table.
 * - Read a table by column ({@link column}) or by row ({@link rows},
 *   {@link toRows}); build one from rows ({@link fromRows}) or columns
 *   ({@link fromColumns}, {@link fromBatches}). Values map as described in
 *   `ArrowColumn`.
 *
 * **Example** (Building a table from rows and reading a column)
 *
 * ```ts import.meta.vitest
 * import { ArrowColumn, ArrowSchema, ArrowTable } from "effect/arrow"
 * import { Option, Result } from "effect"
 *
 * const schema = ArrowSchema.make([
 *   ArrowSchema.field("id", ArrowSchema.int32, { nullable: false }),
 *   ArrowSchema.field("name", ArrowSchema.utf8)
 * ])
 * const table = Result.getOrThrow(
 *   ArrowTable.fromRows(schema, [{ id: 1, name: "a" }, { id: 2 }, { id: 3, name: "c" }], { batchSize: 2 })
 * )
 *
 * table.batches.length // => 2
 * ArrowTable.column(table, "name").pipe(Option.map(ArrowColumn.toArray)) // => Option.some(["a", null, "c"])
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import { dual } from "../Function.ts"
import * as Option from "../Option.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"
import * as ArrowColumn from "./ArrowColumn.ts"
import type * as ArrowData from "./ArrowData.ts"
import type * as ArrowSchema from "./ArrowSchema.ts"
import * as Builders from "./internal/builders.ts"
import * as Layout from "./internal/layout.ts"
import * as Values from "./internal/values.ts"

/**
 * A chunk of rows: one column per schema field.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface RecordBatch {
  readonly schema: ArrowSchema.Schema
  readonly length: number
  readonly columns: ReadonlyArray<ArrowData.ArrowData>
}

/**
 * A schema plus its record batches.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Table {
  readonly schema: ArrowSchema.Schema
  readonly batches: ReadonlyArray<RecordBatch>
}

/**
 * Creates a record batch.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const recordBatch = (
  schema: ArrowSchema.Schema,
  length: number,
  columns: ReadonlyArray<ArrowData.ArrowData>
): RecordBatch => ({ schema, length, columns })

/**
 * Creates a table.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = (schema: ArrowSchema.Schema, batches: ReadonlyArray<RecordBatch>): Table => ({ schema, batches })

/**
 * The total number of rows across all batches.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.5
 */
export const numRows = (self: Table): number => {
  let n = 0
  for (const batch of self.batches) n += batch.length
  return n
}

/**
 * Rows `start` (inclusive) to `end` (exclusive) of the table, like
 * `Array.prototype.slice`, across batches and without copying any buffer.
 * Batches outside the range are dropped and the ones at its edges are sliced.
 * `end` defaults to the number of rows.
 *
 * **Gotchas**
 *
 * - Throws a `RangeError` unless `0 <= start <= end <= numRows`.
 *
 * @stability experimental
 * @category slicing
 * @since 4.1.5
 */
export const slice: {
  (start: number, end?: number): (self: Table) => Table
  (self: Table, start: number, end?: number): Table
} = dual(
  (args) => isTable(args[0]),
  (self: Table, start: number, end?: number): Table => {
    const total = numRows(self)
    const stop = end ?? total
    if (!(start >= 0 && start <= stop && stop <= total)) {
      throw new RangeError(`slice ${start}..${stop} is outside 0..${total}`)
    }
    const batches: Array<RecordBatch> = []
    let first = 0
    for (const batch of self.batches) {
      const from = Math.max(start - first, 0)
      const to = Math.min(stop - first, batch.length)
      if (from < to) {
        batches.push(
          from === 0 && to === batch.length
            ? batch
            : { schema: batch.schema, length: to - from, columns: batch.columns.map((c) => Layout.slice(c, from, to)) }
        )
      }
      first += batch.length
    }
    return { schema: self.schema, batches }
  }
)

const isTable = (u: unknown): u is Table => Predicate.hasProperty(u, "schema") && Predicate.hasProperty(u, "batches")

/**
 * A column of the table, by field name or position, or `Option.none()` when
 * there is no such field. With repeated names, the first field of that name.
 *
 * @stability experimental
 * @category getters
 * @since 4.1.5
 */
export const column: {
  (field: string | number, options?: ArrowColumn.Options): (self: Table) => Option.Option<ArrowColumn.ArrowColumn>
  (self: Table, field: string | number, options?: ArrowColumn.Options): Option.Option<ArrowColumn.ArrowColumn>
} = dual(
  (args) => isTable(args[0]),
  (self: Table, field: string | number, options?: ArrowColumn.Options): Option.Option<ArrowColumn.ArrowColumn> => {
    const index = typeof field === "number" ? field : self.schema.fields.findIndex((f) => f.name === field)
    const f = self.schema.fields[index]
    return f === undefined
      ? Option.none()
      : Option.some(ArrowColumn.make(f, self.batches.map((b) => b.columns[index]), options))
  }
)

const rowsOf = (self: Table, options?: ArrowColumn.Options): Iterable<Record<string, unknown>> => ({
  [Symbol.iterator]: () => {
    const resolved = Values.options(options)
    const fields = self.schema.fields
    const names = fields.map((f) => f.name)
    return Values.iterate(self.batches.length, (b) => self.batches[b].length, (b) => {
      const batch = self.batches[b]
      const readers = fields.map((f, c) => Values.reader(f, batch.columns[c], resolved))
      return (i) => {
        const row: Record<string, unknown> = {}
        for (let c = 0; c < names.length; c++) row[names[c]] = readers[c](i)
        return row
      }
    })
  }
})

/**
 * The rows of the table as plain objects, one property per field, read
 * lazily one row at a time. With repeated field names, the last field of each
 * name wins.
 *
 * @stability experimental
 * @category converting
 * @since 4.1.5
 */
export const rows: {
  (options?: ArrowColumn.Options): (self: Table) => Iterable<Record<string, unknown>>
  (self: Table, options?: ArrowColumn.Options): Iterable<Record<string, unknown>>
} = dual((args) => isTable(args[0]), rowsOf)

/**
 * Reads every row of the table into an array of plain objects. See
 * {@link rows}.
 *
 * @stability experimental
 * @category converting
 * @since 4.1.5
 */
export const toRows: {
  (options?: ArrowColumn.Options): (self: Table) => Array<Record<string, unknown>>
  (self: Table, options?: ArrowColumn.Options): Array<Record<string, unknown>>
} = dual(
  (args) => isTable(args[0]),
  (self: Table, options?: ArrowColumn.Options): Array<Record<string, unknown>> => Array.from(rowsOf(self, options))
)

const buildBatch = (
  schema: ArrowSchema.Schema,
  columns: ReadonlyArray<ReadonlyArray<unknown>>,
  session: Builders.Session,
  rowOffset: number
): RecordBatch => {
  const length = columns[0]?.length ?? 0
  const data = schema.fields.map((f, c) => {
    if (columns[c].length !== length) {
      throw new Builders.BuildFailure(
        `column ${JSON.stringify(f.name)} has ${columns[c].length} values, expected ${length}`,
        [f.name]
      )
    }
    try {
      return Builders.build(f, columns[c], session)
    } catch (e) {
      if (e instanceof Builders.BuildFailure && typeof e.path[0] === "number") {
        throw new Builders.BuildFailure(e.message, [e.path[0] + rowOffset, f.name, ...e.path.slice(1)])
      }
      throw e
    }
  })
  return { schema, length, columns: data }
}

const capture = <A>(f: () => A): Result.Result<A, ArrowColumn.ArrowBuildError> => {
  try {
    return Result.succeed(f())
  } catch (e) {
    if (e instanceof Builders.BuildFailure) {
      return Result.fail(new ArrowColumn.ArrowBuildError({ message: e.message, path: e.path }))
    }
    throw e
  }
}

type Columns = Readonly<Record<string, Iterable<unknown>>> | ReadonlyArray<Iterable<unknown>>

const columnValues = (schema: ArrowSchema.Schema, columns: Columns): Array<Array<unknown>> =>
  schema.fields.map((f, c) => {
    const source = Array.isArray(columns)
      ? columns[c]
      : (columns as Readonly<Record<string, Iterable<unknown>>>)[f.name]
    if (source === undefined) throw new Builders.BuildFailure(`missing column ${JSON.stringify(f.name)}`, [f.name])
    return Array.isArray(source) ? source : Array.from(source)
  })

const buildTable = (
  schema: ArrowSchema.Schema,
  batches: Iterable<ReadonlyArray<ReadonlyArray<unknown>>>,
  options: ArrowColumn.Options | undefined
): Table => {
  const session = Builders.session(Values.options(options))
  const built: Array<RecordBatch> = []
  let rowOffset = 0
  for (const columns of batches) {
    const batch = buildBatch(schema, columns, session, rowOffset)
    built.push(batch)
    rowOffset += batch.length
  }
  // Every batch shares the final dictionary of each id.
  return {
    schema,
    batches: built.map((b) => ({ ...b, columns: b.columns.map((c) => Builders.finish(c, session)) }))
  }
}

/**
 * Builds a table with one record batch per entry of `batches`, each given as
 * one sequence of values per field (by field name, or by position for
 * schemas with repeated names). Dictionary-encoded fields share one
 * dictionary per id across all batches. See {@link ArrowColumn}
 * ("Building") for the accepted values.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromBatches = (
  schema: ArrowSchema.Schema,
  batches: Iterable<Columns>,
  options?: ArrowColumn.Options
): Result.Result<Table, ArrowColumn.ArrowBuildError> =>
  capture(() => buildTable(schema, Array.from(batches, (columns) => columnValues(schema, columns)), options))

/**
 * Builds a single-batch table from one sequence of values per field. See
 * {@link fromBatches}.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromColumns = (
  schema: ArrowSchema.Schema,
  columns: Columns,
  options?: ArrowColumn.Options
): Result.Result<Table, ArrowColumn.ArrowBuildError> => fromBatches(schema, [columns], options)

/**
 * Builds a table from row objects, one property per field (missing
 * properties are null). Rows are split into batches of `batchSize` rows
 * (default: one batch). See {@link ArrowColumn} ("Building") for the
 * accepted values.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromRows = (
  schema: ArrowSchema.Schema,
  rows: Iterable<Readonly<Record<string, unknown>>>,
  options?: ArrowColumn.Options & { readonly batchSize?: number | undefined }
): Result.Result<Table, ArrowColumn.ArrowBuildError> =>
  capture(() => {
    const batchSize = options?.batchSize ?? Infinity
    const batches: Array<Array<Array<unknown>>> = []
    let columns: Array<Array<unknown>> = schema.fields.map(() => [])
    let count = 0
    for (const row of rows) {
      schema.fields.forEach((f, c) => columns[c].push(row[f.name] ?? null))
      if (++count >= batchSize) {
        batches.push(columns)
        columns = schema.fields.map(() => [])
        count = 0
      }
    }
    if (count > 0 || batches.length === 0) batches.push(columns)
    return buildTable(schema, batches, options)
  })
