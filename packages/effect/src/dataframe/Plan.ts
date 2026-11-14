/**
 * Queries as plain data: the nodes a `Query` is made of, and schemas
 * that validate them and encode them to JSON.
 *
 * **Mental model**
 *
 * - A plan is a tree of {@link Node}s. Leaves are inputs ({@link Values}
 *   holds a frame, {@link Table} names a table the `Catalog` provides);
 *   every other node transforms the rows of its input(s).
 * - Column values are computed by {@link Expression}s: column references,
 *   literals, function calls and aggregate calls. Function and aggregate
 *   names are the names of the `Expr` constructors (`add`, `gt`, `mean`, …).
 * - Plans are what `Query` builds, what `Query.explain` prints and what
 *   `Query.fromPlan` runs. Building them from data (a request body, a stored
 *   report definition, a tool call) needs no TypeScript types: decode with
 *   {@link Node} or {@link NodeFromJson}, then run.
 *
 * **Example** (A plan from JSON)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Catalog, DataFrame, Plan, Query } from "effect/dataframe"
 *
 * const json = {
 *   _tag: "Filter",
 *   input: { _tag: "Table", name: "readings" },
 *   predicate: {
 *     _tag: "Call",
 *     fn: "gt",
 *     args: [{ _tag: "Column", name: "temp" }, { _tag: "Literal", value: 20 }]
 *   }
 * }
 *
 * const plan = Schema.decodeUnknownSync(Plan.NodeFromJson)(json)
 * const readings = DataFrame.fromColumns({ temp: [18, 21.5, 24] })
 *
 * const result = Query.fromPlan(plan).pipe(
 *   Effect.provide(Catalog.layer({ readings })),
 *   Effect.map(DataFrame.toRows),
 *   Effect.runSync
 * )
 * result // => [{ temp: 21.5 }, { temp: 24 }]
 * ```
 *
 * **Details**
 *
 * In JSON, literal values are JSON values where that is unambiguous: strings,
 * booleans, `null` and finite numbers. A `bigint` is written as
 * `{ "bigint": "<digits>" }` and `NaN`, `Infinity`, `-Infinity` and `-0` as
 * `{ "float": "NaN" }` and so on. A {@link Values} frame is written as a
 * base64 Arrow IPC file.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as ArrowIpc from "../arrow/ArrowIpc.ts"
import * as Effect from "../Effect.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import type { DataFrame } from "./DataFrame.ts"
import * as F from "./internal/frame.ts"

// -----------------------------------------------------------------------------
// Values
// -----------------------------------------------------------------------------

/**
 * A literal value.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Value = number | bigint | string | boolean | null

const isValue = (u: unknown): u is Value =>
  u === null || typeof u === "number" || typeof u === "bigint" || typeof u === "string" || typeof u === "boolean"

const FloatName = Schema.Literals(["NaN", "Infinity", "-Infinity", "-0"])

const ValueJson = Schema.Union([
  Schema.String,
  Schema.Boolean,
  Schema.Null,
  Schema.Finite,
  Schema.Struct({ bigint: Schema.String }),
  Schema.Struct({ float: FloatName })
])

const floatValues: Record<typeof FloatName.Type, number> = {
  NaN: NaN,
  Infinity: Infinity,
  "-Infinity": -Infinity,
  "-0": -0
}

const valueFromJson: SchemaTransformation.Transformation<Value, typeof ValueJson.Type> = SchemaTransformation
  .transformEffect({
    decode: (json, options): Effect.Effect<Value, SchemaIssue.Issue> => {
      if (json === null || typeof json !== "object") return Effect.succeed(json)
      if ("float" in json) return Effect.succeed(floatValues[json.float])
      try {
        return Effect.succeed(BigInt(json.bigint))
      } catch {
        return Effect.fail(new SchemaIssue.InvalidValue({ expected: "an integer" }, json, options))
      }
    },
    encode: (value) => {
      if (typeof value === "bigint") return Effect.succeed({ bigint: value.toString() })
      if (typeof value === "number" && (!Number.isFinite(value) || Object.is(value, -0))) {
        return Effect.succeed({
          float: Number.isNaN(value) ? "NaN" as const : value === Infinity ? "Infinity" as const : value === -Infinity
            ? "-Infinity" as const
            : "-0" as const
        })
      }
      return Effect.succeed(value as string | number | boolean | null)
    }
  })

/**
 * Schema of {@link Value}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const Value: Schema.declare<Value> = Schema.declare(isValue, {
  expected: "number | bigint | string | boolean | null",
  toCodecJson: () => Schema.link<Value>()(ValueJson, valueFromJson)
})

const isDataFrame = (u: unknown): u is DataFrame<unknown> => F.isFrame(u)

const frameFromBytes: SchemaTransformation.Transformation<DataFrame<unknown>, Uint8Array> = SchemaTransformation
  .transformEffect({
    decode: (bytes, options) => {
      const table = ArrowIpc.decodeFile(bytes)
      if (Result.isFailure(table)) {
        return Effect.fail(new SchemaIssue.InvalidValue({ expected: "an Arrow IPC file" }, bytes, options))
      }
      try {
        return Effect.succeed(F.fromArrowTable(table.success) as unknown as DataFrame<unknown>)
      } catch (cause) {
        return Effect.fail(new SchemaIssue.InvalidValue({ expected: `a supported table: ${String(cause)}` }, bytes))
      }
    },
    encode: (frame, options) => {
      const bytes = ArrowIpc.encodeFile(F.toArrowTable(frame as unknown as F.Frame))
      return Result.isSuccess(bytes)
        ? Effect.succeed(bytes.success)
        : Effect.fail(new SchemaIssue.InvalidValue({ expected: "a frame Arrow can encode" }, frame, options))
    }
  })

/**
 * Schema of a {@link DataFrame} inside a plan. Its JSON form is a base64
 * Arrow IPC file.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const Frame: Schema.declare<DataFrame<unknown>> = Schema.declare(isDataFrame, {
  expected: "DataFrame",
  toCodecJson: () => Schema.link<DataFrame<unknown>>()(Schema.Uint8ArrayFromBase64, frameFromBytes)
})

// -----------------------------------------------------------------------------
// Expressions
// -----------------------------------------------------------------------------

/**
 * Names of the functions a {@link Call} can apply; each is the `Expr`
 * constructor of the same name.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type FunctionName = typeof FunctionName.Type

/**
 * Schema of {@link FunctionName}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const FunctionName = Schema.Literals([
  "add",
  "subtract",
  "multiply",
  "divide",
  "floorDivide",
  "mod",
  "negate",
  "abs",
  "sqrt",
  "round",
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "between",
  "isIn",
  "and",
  "or",
  "not",
  "isNull",
  "isNotNull",
  "isNaN",
  "fillNull",
  "coalesce",
  "when",
  "cast",
  "length",
  "toLowerCase",
  "toUpperCase",
  "includes",
  "startsWith",
  "endsWith",
  "concat",
  "cumSum",
  "cumMin",
  "cumMax",
  "cumCount",
  "shift",
  "diff",
  "rank",
  "rollingSum",
  "rollingMean",
  "rollingMin",
  "rollingMax",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "millisecond",
  "weekday",
  "ordinalDay",
  "truncate",
  "totalDays",
  "totalHours",
  "totalMinutes",
  "totalSeconds",
  "totalMilliseconds",
  "listLength",
  "listGet",
  "listSum",
  "listMean",
  "listMin",
  "listMax",
  "listContains",
  "field",
  "struct"
])

/**
 * Names of the aggregates an {@link AggregateCall} can compute; each is the
 * `Expr` constructor of the same name. `count` without an argument counts
 * rows.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type AggregateName = typeof AggregateName.Type

/**
 * Schema of {@link AggregateName}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const AggregateName = Schema.Literals([
  "sum",
  "mean",
  "median",
  "std",
  "variance",
  "min",
  "max",
  "count",
  "countDistinct",
  "first",
  "last",
  "list"
])

/**
 * Names of the types `cast` converts to.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type CastTarget = typeof CastTarget.Type

/**
 * Schema of {@link CastTarget}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const CastTarget = Schema.Literals([
  "Int8",
  "Int16",
  "Int32",
  "Int64",
  "UInt8",
  "UInt16",
  "UInt32",
  "UInt64",
  "Float32",
  "Float64",
  "Utf8",
  "Bool",
  "Date",
  "Timestamp[s]",
  "Timestamp[ms]",
  "Timestamp[us]",
  "Timestamp[ns]",
  "Duration[s]",
  "Duration[ms]",
  "Duration[us]",
  "Duration[ns]",
  "Decimal"
])

/**
 * The type of a {@link Literal} whose value is the integer storage of a
 * richer type: days since the epoch for `Date`, units since the epoch for
 * `Timestamp`, units for `Duration`, and the unscaled integer for `Decimal`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type LiteralType =
  | { readonly _tag: "Date" }
  | { readonly _tag: "Timestamp"; readonly unit: TimeUnit; readonly timezone?: string | undefined }
  | { readonly _tag: "Duration"; readonly unit: TimeUnit }
  | { readonly _tag: "Decimal"; readonly precision: number; readonly scale: number }

/**
 * Units of timestamps and durations.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type TimeUnit = typeof TimeUnit.Type

/**
 * Schema of {@link TimeUnit}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const TimeUnit = Schema.Literals(["second", "millisecond", "microsecond", "nanosecond"])

const LiteralTypeSchema: Schema.Codec<LiteralType, unknown> = Schema.Union([
  Schema.Struct({ _tag: Schema.tag("Date") }),
  Schema.Struct({ _tag: Schema.tag("Timestamp"), unit: TimeUnit, timezone: Schema.optional(Schema.String) }),
  Schema.Struct({ _tag: Schema.tag("Duration"), unit: TimeUnit }),
  Schema.Struct({ _tag: Schema.tag("Decimal"), precision: Schema.Int, scale: Schema.Int })
]) as any

/**
 * A value computed per row (or per group, for aggregate calls).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Expression = Column | Literal | Call | AggregateCall | Over

/**
 * The value of a column.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Column {
  readonly _tag: "Column"
  readonly name: string
}

/**
 * A constant. Integral numbers take the integer type of the column they meet,
 * as Polars integer literals do.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Literal {
  readonly _tag: "Literal"
  readonly value: Value
  readonly type?: LiteralType | undefined
}

/**
 * Options of the functions that take more than expressions: `round`
 * (`decimals`), `cast` (`to`), `isIn` (`values`), `includes`, `startsWith`
 * and `endsWith` (`pattern`), `shift` and `diff` (`n`), `rank` (`method`,
 * `descending`), the rolling functions (`window`, `minPeriods`) and
 * `truncate` (`every`: `"1h"`, `"1d"`, `"1w"`, `"1mo"`, `"1y"`, …), `listGet`
 * (`index`), `field` (`name`), `struct` (`names`, one per argument) and
 * `cast` to `Decimal` (`precision`, `scale`).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface CallOptions {
  readonly decimals?: number | undefined
  readonly to?: CastTarget | undefined
  readonly values?: ReadonlyArray<Value> | undefined
  readonly pattern?: string | undefined
  readonly n?: number | undefined
  readonly method?: RankMethod | undefined
  readonly descending?: boolean | undefined
  readonly window?: number | undefined
  readonly minPeriods?: number | undefined
  readonly every?: string | undefined
  readonly index?: number | undefined
  readonly name?: string | undefined
  readonly names?: ReadonlyArray<string> | undefined
  readonly precision?: number | undefined
  readonly scale?: number | undefined
}

/**
 * How `rank` numbers ties: `average` (the mean of their positions, a float),
 * `min`, `max`, `dense` (consecutive ranks) or `ordinal` (by row order).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type RankMethod = typeof RankMethod.Type

/**
 * Schema of {@link RankMethod}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const RankMethod = Schema.Literals(["average", "min", "max", "dense", "ordinal"])

/**
 * A function applied to argument expressions, row by row.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Call {
  readonly _tag: "Call"
  readonly fn: FunctionName
  readonly args: ReadonlyArray<Expression>
  readonly options?: CallOptions | undefined
}

/**
 * An aggregate over the rows of a group. Only valid as an output of
 * {@link GroupBy} or {@link Aggregate}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface AggregateCall {
  readonly _tag: "AggregateCall"
  readonly fn: AggregateName
  readonly arg?: Expression | undefined
}

/**
 * An expression evaluated separately within each partition of rows with
 * equal `partitionBy` values, its results in row order: aggregates give
 * their partition's value on every row, window functions (`cumSum`,
 * `shift`, `rank`, …) run over their partition's rows.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Over {
  readonly _tag: "Over"
  readonly expression: Expression
  readonly partitionBy: ReadonlyArray<Expression>
}

const ExpressionSchema = Schema.suspend((): Schema.Codec<Expression, unknown> => ExpressionUnion)

const ColumnSchema = Schema.Struct({ _tag: Schema.tag("Column"), name: Schema.String })
const LiteralSchema = Schema.Struct({
  _tag: Schema.tag("Literal"),
  value: Value,
  type: Schema.optional(LiteralTypeSchema)
})
const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))
const CallOptionsSchema = Schema.Struct({
  decimals: Schema.optional(Schema.Int),
  to: Schema.optional(CastTarget),
  values: Schema.optional(Schema.Array(Value)),
  pattern: Schema.optional(Schema.String),
  n: Schema.optional(Schema.Int),
  method: Schema.optional(RankMethod),
  descending: Schema.optional(Schema.Boolean),
  window: Schema.optional(PositiveInt),
  minPeriods: Schema.optional(PositiveInt),
  every: Schema.optional(Schema.String),
  index: Schema.optional(Schema.Int),
  name: Schema.optional(Schema.String),
  names: Schema.optional(Schema.Array(Schema.String)),
  precision: Schema.optional(PositiveInt),
  scale: Schema.optional(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)))
})
const CallSchema = Schema.Struct({
  _tag: Schema.tag("Call"),
  fn: FunctionName,
  args: Schema.Array(ExpressionSchema),
  options: Schema.optional(CallOptionsSchema)
})
const AggregateCallSchema = Schema.Struct({
  _tag: Schema.tag("AggregateCall"),
  fn: AggregateName,
  arg: Schema.optional(ExpressionSchema)
})
const OverSchema = Schema.Struct({
  _tag: Schema.tag("Over"),
  expression: ExpressionSchema,
  partitionBy: Schema.Array(ExpressionSchema)
})
const ExpressionUnion = Schema.Union([ColumnSchema, LiteralSchema, CallSchema, AggregateCallSchema, OverSchema])

/**
 * Schema of {@link Expression}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const Expression: Schema.Codec<Expression, unknown> = ExpressionSchema

/**
 * An expression and the name of the column it produces.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Named {
  readonly name: string
  readonly expression: Expression
}

const NamedSchema = Schema.Struct({ name: Schema.String, expression: ExpressionSchema })

/**
 * A sort key.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface SortKey {
  readonly expression: Expression
  readonly descending: boolean
}

const SortKeySchema = Schema.Struct({ expression: ExpressionSchema, descending: Schema.Boolean })

// -----------------------------------------------------------------------------
// Nodes
// -----------------------------------------------------------------------------

/**
 * A query plan.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Node =
  | Values
  | Table
  | Filter
  | Select
  | WithColumns
  | Sort
  | Slice
  | Unique
  | DropNulls
  | Pick
  | Omit
  | Rename
  | GroupBy
  | Aggregate
  | Join
  | Concat
  | Pivot
  | Unpivot
  | Explode
  | Unnest

/**
 * The rows of a frame.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Values {
  readonly _tag: "Values"
  readonly frame: DataFrame<unknown>
}

/**
 * The type names a {@link Table} can declare for its columns.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type TypeName = typeof TypeName.Type

/**
 * Schema of {@link TypeName}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const TypeName = Schema.Literals([
  "Int8",
  "Int16",
  "Int32",
  "Int64",
  "UInt8",
  "UInt16",
  "UInt32",
  "UInt64",
  "Float16",
  "Float32",
  "Float64",
  "Utf8",
  "Binary",
  "Bool",
  "Null",
  "Date",
  "Time",
  "Timestamp",
  "Duration",
  "Decimal"
])

/**
 * A column a {@link Table} is expected to have.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface TableColumn {
  readonly name: string
  readonly type: TypeName
  readonly nullable: boolean
}

/**
 * The rows of a table the `Catalog` provides by name.
 *
 * **Details**
 *
 * When `columns` is given, the table must have these columns, with types of
 * the same kind (any integer width for an integer column, and integers below
 * 64 bits for a float column), and no nulls in non-nullable ones; the input
 * is narrowed to these columns, in this order.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Table {
  readonly _tag: "Table"
  readonly name: string
  readonly columns?: ReadonlyArray<TableColumn> | undefined
}

/**
 * The rows where `predicate` is `true`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Filter {
  readonly _tag: "Filter"
  readonly input: Node
  readonly predicate: Expression
}

/**
 * Only the given computed columns.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Select {
  readonly _tag: "Select"
  readonly input: Node
  readonly columns: ReadonlyArray<Named>
}

/**
 * The input's columns plus the given computed columns (replacing columns of
 * the same name in place).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface WithColumns {
  readonly _tag: "WithColumns"
  readonly input: Node
  readonly columns: ReadonlyArray<Named>
}

/**
 * The rows in key order, stable, nulls first unless `nullsLast`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Sort {
  readonly _tag: "Sort"
  readonly input: Node
  readonly keys: ReadonlyArray<SortKey>
  readonly nullsLast: boolean
}

/**
 * `length` rows (all remaining when absent) from `offset`; a negative offset
 * counts from the end.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Slice {
  readonly _tag: "Slice"
  readonly input: Node
  readonly offset: number
  readonly length?: number | undefined
}

/**
 * The first row of every distinct combination of `columns` (all when absent).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Unique {
  readonly _tag: "Unique"
  readonly input: Node
  readonly columns?: ReadonlyArray<string> | undefined
}

/**
 * The rows without nulls in `columns` (all when absent).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface DropNulls {
  readonly _tag: "DropNulls"
  readonly input: Node
  readonly columns?: ReadonlyArray<string> | undefined
}

/**
 * Only the given columns, in the given order.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Pick {
  readonly _tag: "Pick"
  readonly input: Node
  readonly columns: ReadonlyArray<string>
}

/**
 * All columns but the given ones.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Omit {
  readonly _tag: "Omit"
  readonly input: Node
  readonly columns: ReadonlyArray<string>
}

/**
 * The input with columns renamed: `{ old: "new" }`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Rename {
  readonly _tag: "Rename"
  readonly input: Node
  readonly mapping: { readonly [name: string]: string }
}

/**
 * One row per distinct key, in order of first appearance: the keys, then the
 * aggregates.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface GroupBy {
  readonly _tag: "GroupBy"
  readonly input: Node
  readonly keys: ReadonlyArray<string>
  readonly aggregates: ReadonlyArray<Named>
}

/**
 * One row of aggregates over all rows.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Aggregate {
  readonly _tag: "Aggregate"
  readonly input: Node
  readonly aggregates: ReadonlyArray<Named>
}

/**
 * How a {@link Join} combines rows.
 *
 * **Details**
 *
 * - `inner`: rows whose key exists on both sides
 * - `left`: every left row; right columns are `null` where nothing matched
 * - `full`: every row of both sides; keys are taken from whichever side has them
 * - `semi`: left rows that have a match (left columns only)
 * - `anti`: left rows without a match (left columns only)
 *
 * Null keys never match.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type JoinHow = typeof JoinHow.Type

/**
 * Schema of {@link JoinHow}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const JoinHow = Schema.Literals(["inner", "left", "full", "semi", "anti"])

/**
 * Rows of `left` and `right` with equal `on` columns, in left row order.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Join {
  readonly _tag: "Join"
  readonly left: Node
  readonly right: Node
  readonly on: ReadonlyArray<string>
  readonly how: JoinHow
}

/**
 * The rows of every input, one after the other.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Concat {
  readonly _tag: "Concat"
  readonly inputs: ReadonlyArray<Node>
}

/**
 * Aggregates a {@link Pivot} can put in its cells: the {@link AggregateName}s
 * and `len` (the number of rows).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type PivotAggregate = AggregateName | "len"

/**
 * One row per distinct `index`, one column per distinct value of `on`, and
 * in each cell the aggregate of `values` over the rows with that index and
 * `on` value.
 *
 * **Details**
 *
 * Columns are named by the `on` values as strings (`null` for a null), in
 * order of first appearance; with `columns`, exactly those columns, in that
 * order. A cell without rows holds the aggregate of no values: 0 for `sum`,
 * `count` and `len`, otherwise null.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Pivot {
  readonly _tag: "Pivot"
  readonly input: Node
  readonly on: string
  readonly index: ReadonlyArray<string>
  readonly values: string
  readonly aggregate: PivotAggregate
  readonly columns?: ReadonlyArray<string> | undefined
}

/**
 * The `on` columns stacked into one `value` column, one block of rows per
 * column, with the column's name in `variable` and the `index` columns
 * repeated.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Unpivot {
  readonly _tag: "Unpivot"
  readonly input: Node
  readonly index: ReadonlyArray<string>
  readonly on: ReadonlyArray<string>
  readonly variable: string
  readonly value: string
}

/**
 * One row per element of the list column `column`, the other columns
 * repeated. A null list gives one row with a null element; an empty list
 * gives no rows.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Explode {
  readonly _tag: "Explode"
  readonly input: Node
  readonly column: string
}

/**
 * The fields of the struct column `column` as columns, in its place.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Unnest {
  readonly _tag: "Unnest"
  readonly input: Node
  readonly column: string
}

const NodeSchema = Schema.suspend((): Schema.Codec<Node, unknown> => NodeUnion)
const Columns = Schema.Array(Schema.String)
const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

const NodeUnion = Schema.Union([
  Schema.Struct({ _tag: Schema.tag("Values"), frame: Frame }),
  Schema.Struct({
    _tag: Schema.tag("Table"),
    name: Schema.String,
    columns: Schema.optional(
      Schema.Array(Schema.Struct({ name: Schema.String, type: TypeName, nullable: Schema.Boolean }))
    )
  }),
  Schema.Struct({ _tag: Schema.tag("Filter"), input: NodeSchema, predicate: ExpressionSchema }),
  Schema.Struct({ _tag: Schema.tag("Select"), input: NodeSchema, columns: Schema.Array(NamedSchema) }),
  Schema.Struct({ _tag: Schema.tag("WithColumns"), input: NodeSchema, columns: Schema.Array(NamedSchema) }),
  Schema.Struct({
    _tag: Schema.tag("Sort"),
    input: NodeSchema,
    keys: Schema.Array(SortKeySchema),
    nullsLast: Schema.Boolean
  }),
  Schema.Struct({
    _tag: Schema.tag("Slice"),
    input: NodeSchema,
    offset: Schema.Int,
    length: Schema.optional(NonNegativeInt)
  }),
  Schema.Struct({ _tag: Schema.tag("Unique"), input: NodeSchema, columns: Schema.optional(Columns) }),
  Schema.Struct({ _tag: Schema.tag("DropNulls"), input: NodeSchema, columns: Schema.optional(Columns) }),
  Schema.Struct({ _tag: Schema.tag("Pick"), input: NodeSchema, columns: Columns }),
  Schema.Struct({ _tag: Schema.tag("Omit"), input: NodeSchema, columns: Columns }),
  Schema.Struct({
    _tag: Schema.tag("Rename"),
    input: NodeSchema,
    mapping: Schema.Record(Schema.String, Schema.String)
  }),
  Schema.Struct({
    _tag: Schema.tag("GroupBy"),
    input: NodeSchema,
    keys: Columns,
    aggregates: Schema.Array(NamedSchema)
  }),
  Schema.Struct({ _tag: Schema.tag("Aggregate"), input: NodeSchema, aggregates: Schema.Array(NamedSchema) }),
  Schema.Struct({
    _tag: Schema.tag("Join"),
    left: NodeSchema,
    right: NodeSchema,
    on: Columns,
    how: JoinHow
  }),
  Schema.Struct({ _tag: Schema.tag("Concat"), inputs: Schema.Array(NodeSchema) }),
  Schema.Struct({
    _tag: Schema.tag("Pivot"),
    input: NodeSchema,
    on: Schema.String,
    index: Columns,
    values: Schema.String,
    aggregate: Schema.Union([AggregateName, Schema.Literal("len")]),
    columns: Schema.optional(Columns)
  }),
  Schema.Struct({ _tag: Schema.tag("Explode"), input: NodeSchema, column: Schema.String }),
  Schema.Struct({ _tag: Schema.tag("Unnest"), input: NodeSchema, column: Schema.String }),
  Schema.Struct({
    _tag: Schema.tag("Unpivot"),
    input: NodeSchema,
    index: Columns,
    on: Columns,
    variable: Schema.String,
    value: Schema.String
  })
])

/**
 * Schema of {@link Node}.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const Node: Schema.Codec<Node, unknown> = NodeSchema

/**
 * A {@link Node} from its JSON form.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const NodeFromJson: Schema.Codec<Node, Schema.Json> = Schema.toCodecJson(Node) as any

/**
 * An {@link Expression} from its JSON form.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.5
 */
export const ExpressionFromJson: Schema.Codec<Expression, Schema.Json> = Schema.toCodecJson(Expression) as any
