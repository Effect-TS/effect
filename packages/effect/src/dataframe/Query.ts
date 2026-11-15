/**
 * Lazy, typed queries over data frames: describe filters, derived columns,
 * sorts, groups and joins, then run them as an `Effect`.
 *
 * **Mental model**
 *
 * - A `Query<Row>` describes how to compute a table whose rows have type
 *   `Row`. Building one does no work; every function returns a new query
 *   with one more operation, and the row type follows along.
 * - A query is a {@link Plan.Node} underneath, plain data that can be
 *   inspected, stored, encoded to JSON and run again ({@link fromPlan}).
 * - A query is an `Effect<DataFrame<Row>, DataFrameError>`: `yield*` it,
 *   or pass it to any `Effect` function. Running it reads the tables it
 *   names from the `Catalog`, rewrites the plan to do less work, and
 *   executes it.
 * - Expressions come from {@link Expr}. Functions that take expressions take
 *   a callback that receives one typed reference per column; it runs once,
 *   when the query is built.
 *
 * **Example** (Summarising readings per city)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { DataFrame, Expr, Query } from "effect/dataframe"
 *
 * const Reading = Schema.Struct({ city: Schema.String, temp: Schema.Number })
 * const readings = DataFrame.fromRows(Reading, [
 *   { city: "Vienna", temp: 21.5 },
 *   { city: "Berlin", temp: 26.5 },
 *   { city: "Vienna", temp: 19 },
 *   { city: "Zurich", temp: 15 }
 * ])
 *
 * const summary = Query.from(readings).pipe(
 *   Query.filter((c) => Expr.gt(c.temp, 16)),
 *   Query.groupBy("city"),
 *   Query.agg((c) => ({ readings: Expr.count(), mean: Expr.mean(c.temp) })),
 *   Query.sort((c) => [Expr.desc(c.mean)])
 * )
 *
 * const rows = Effect.runSync(Effect.map(summary, DataFrame.toRows))
 * rows[0] // => { city: "Berlin", readings: 1, mean: 26.5 }
 * rows[1] // => { city: "Vienna", readings: 2, mean: 20.25 }
 * ```
 *
 * **Details**
 *
 * Results match Polars for the same operations: groups and `unique` keep
 * first-appearance order, sorting is stable with nulls first unless
 * `nullsLast` is set, and joins keep the left row order (with right rows in
 * their order within a key). See {@link Expr} for value semantics.
 *
 * Before running, the plan is rewritten: predicates move below the
 * operations they commute with, filters merge, slices move below row-wise
 * operations (and a slice of a sort keeps only the rows it needs), and
 * columns and aggregates nothing reads are not computed. {@link explain}
 * shows the plan that runs.
 *
 * **Gotchas**
 *
 * - The column references passed to callbacks are created on access, so
 *   spreading or enumerating them yields nothing.
 * - Joins require the non-key columns of both sides to have different
 *   names; rename first.
 * - A long query yields to other fibers between operations, so it can be
 *   interrupted or timed out, but not in the middle of one operation.
 *
 * @stability experimental
 * @since 4.1.5
 */
import type * as BigDecimal from "../BigDecimal.ts"
import * as Effect from "../Effect.ts"
import * as Effectable from "../Effectable.ts"
import { dual } from "../Function.ts"
import { NodeInspectSymbol } from "../Inspectable.ts"
import * as Stream from "../Stream.ts"
import type * as Types from "../Types.ts"
import type { DataFrame, DataFrameError } from "./DataFrame.ts"
import { Engine } from "./Engine.ts"
import type * as Expr from "./Expr.ts"
import * as E from "./internal/expr.ts"
import * as Q from "./internal/query.ts"
import * as Schema_ from "./internal/schema.ts"
import type * as Plan from "./Plan.ts"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * Identifies queries.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.5
 */
export const TypeId = "~effect/dataframe/Query"

/**
 * A lazy computation of a table whose rows have type `Row`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Query<out Row> extends Effect.Effect<DataFrame<Row>, DataFrameError> {
  readonly [TypeId]: {
    readonly _Row: Types.Covariant<Row>
  }
  /** The query as data. */
  readonly plan: Plan.Node
}

/**
 * One typed column reference per column, as passed to expression callbacks.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Columns<Row> = { readonly [K in keyof Row & string]: Expr.Expr<Row[K]> }

/**
 * A query split into groups by key columns, waiting for {@link agg}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface GroupBy<out Row, out Keys extends keyof Row> {
  readonly _tag: "GroupBy"
  readonly query: Query<Row>
  readonly keys: ReadonlyArray<Keys>
}

/**
 * The row type of a query.
 *
 * @stability experimental
 * @category type-level
 * @since 4.1.5
 */
export type Row<Q> = Q extends Query<infer R> ? R : never

/**
 * How {@link join} combines rows; see {@link Plan.JoinHow}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type JoinHow = Plan.JoinHow

/**
 * The row type of a join.
 *
 * @stability experimental
 * @category type-level
 * @since 4.1.5
 */
export type Joined<R, R2, On extends keyof R & keyof R2, How extends JoinHow> = Simplify<
  How extends "semi" | "anti" ? R
    : How extends "inner" ? R & Omit<R2, On>
    : How extends "left" ? R & Nullable<Omit<R2, On>>
    : Pick<R, On> & Nullable<Omit<R, On>> & Nullable<Omit<R2, On>>
>

type Simplify<A> = { readonly [K in keyof A]: A[K] } extends infer B ? B : never
type Nullable<R> = { readonly [K in keyof R]: R[K] | null }

type JoinCheck<R, R2, On> = [Exclude<keyof R & keyof R2, On>] extends [never] ? unknown
  : { readonly "~error": `rename the columns that exist on both sides: ${Exclude<keyof R & keyof R2, On> & string}` }

interface QueryImpl extends Query<unknown> {}

const Proto = {
  ...Effectable.Prototype<QueryImpl>({
    label: "Query",
    evaluate(fiber) {
      return fiber.getRef(Engine).collect(this.plan) as any
    }
  }),
  [TypeId]: { _Row: (_: never) => _ },
  toJSON(this: QueryImpl) {
    return { _id: "Query", plan: this.plan }
  },
  toString(this: QueryImpl) {
    return Q.show(this.plan)
  },
  [NodeInspectSymbol](this: QueryImpl) {
    return this.toJSON()
  }
}

const make = <R>(plan: Plan.Node): Query<R> => {
  const self = Object.create(Proto)
  self.plan = plan
  return self
}

/**
 * Returns `true` for queries.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isQuery = (u: unknown): u is Query<unknown> => typeof u === "object" && u !== null && TypeId in u

const columns: any = new Proxy({}, {
  get: (_, name) => typeof name === "string" ? E.makeExpr({ _tag: "Column", name }) : undefined
})

const named = (exprs: { readonly [name: string]: unknown }): Array<Plan.Named> =>
  Object.keys(exprs).map((name) => ({ name, expression: E.toNode(exprs[name]) }))

const isGroupBy = (u: unknown): u is GroupBy<unknown, never> =>
  typeof u === "object" && u !== null && (u as { _tag?: unknown })._tag === "GroupBy" && "query" in u

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * A query over the rows of a frame.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const from = <R>(frame: DataFrame<R>): Query<R> => make({ _tag: "Values", frame: frame as DataFrame<unknown> })

/**
 * A query over the table called `name`, provided by the `Catalog` when
 * the query runs. The table must have the columns of the struct schema (see
 * `DataFrame.validate`); the query sees only those, in the schema's order.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const table = <S extends { readonly Type: object; readonly ast: any }>(
  name: string,
  schema: S
): Query<Simplify<S["Type"]>> =>
  make({ _tag: "Table", name, columns: Schema_.tableColumns(Schema_.toArrowSchema(schema, undefined)) })

/**
 * A query from its plan, with untyped rows. Decode untrusted plans with
 * {@link Plan.Node} or {@link Plan.NodeFromJson} first.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const fromPlan = (plan: Plan.Node): Query<{ readonly [name: string]: unknown }> => make(plan)

/**
 * The query's result as a stream of batches.
 *
 * **Details**
 *
 * Over streamed tables (a `Stream` in the `Catalog`), row-wise operations
 * run on each batch as it arrives and a `head` stops reading once it has its
 * rows; grouping and aggregation fold the batches into one result. Over
 * frames, the result is one batch.
 *
 * **Example** (Filtering a stream of batches)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { Catalog, DataFrame, Expr, Query } from "effect/dataframe"
 *
 * const batch = (from: number) => DataFrame.fromColumns({ n: Int32Array.from({ length: 3 }, (_, i) => from + i) })
 * const numbers = Stream.make(batch(0), batch(3), batch(6))
 *
 * const sizes = Query.fromPlan({ _tag: "Table", name: "numbers" }).pipe(
 *   Query.filter((c) => Expr.gt(c.n as Expr.Expr<number>, 2)),
 *   Query.stream,
 *   Stream.map((frame) => frame.length),
 *   Stream.runCollect,
 *   Effect.provide(Catalog.layer({ numbers })),
 *   Effect.runSync
 * )
 * sizes // => [3, 3]
 * ```
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const stream = <R>(self: Query<R>): Stream.Stream<DataFrame<R>, DataFrameError> =>
  Stream.unwrap(Engine.use((engine) => Effect.succeed(engine.stream(self.plan) as any)))

/**
 * The plan that runs for a query, after tables are resolved and the plan is
 * rewritten, as an indented tree with one operation per line.
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const explain = <R>(self: Query<R>): Effect.Effect<string, DataFrameError> =>
  Engine.use((engine) => engine.explain(self.plan))

// -----------------------------------------------------------------------------
// Rows
// -----------------------------------------------------------------------------

/**
 * Keeps the rows where the predicate is `true` (`null` counts as `false`).
 *
 * @stability experimental
 * @category filtering
 * @since 4.1.5
 */
export const filter: {
  <R>(predicate: (columns: Columns<R>) => Expr.Expr<boolean | null>): (self: Query<R>) => Query<R>
  <R>(self: Query<R>, predicate: (columns: Columns<R>) => Expr.Expr<boolean | null>): Query<R>
} = dual(
  2,
  <R>(self: Query<R>, predicate: (columns: Columns<R>) => Expr.Expr<boolean | null>): Query<R> =>
    make({ _tag: "Filter", input: self.plan, predicate: E.toNode(predicate(columns)) })
)

/**
 * Sorts by the given keys, first key first; ties keep their order. Nulls
 * come first unless `nullsLast` is set.
 *
 * @stability experimental
 * @category sorting
 * @since 4.1.5
 */
export const sort: {
  <R>(
    keys: (columns: Columns<R>) => ReadonlyArray<Expr.Expr<unknown> | Expr.SortOrder<unknown>>,
    options?: { readonly nullsLast?: boolean | undefined }
  ): (self: Query<R>) => Query<R>
  <R>(
    self: Query<R>,
    keys: (columns: Columns<R>) => ReadonlyArray<Expr.Expr<unknown> | Expr.SortOrder<unknown>>,
    options?: { readonly nullsLast?: boolean | undefined }
  ): Query<R>
} = dual((args) => isQuery(args[0]), <R>(
  self: Query<R>,
  keys: (columns: Columns<R>) => ReadonlyArray<Expr.Expr<unknown> | Expr.SortOrder<unknown>>,
  options?: { readonly nullsLast?: boolean | undefined }
): Query<R> =>
  make({
    _tag: "Sort",
    input: self.plan,
    keys: keys(columns).map((k) =>
      E.isExpr(k)
        ? { expression: k.node, descending: false }
        : {
          expression: E.toNode((k as Expr.SortOrder<unknown>).expr),
          descending: (k as Expr.SortOrder<unknown>).descending
        }
    ),
    nullsLast: options?.nullsLast ?? false
  }))

/**
 * `length` rows (all remaining when omitted) starting at `offset`; a negative
 * offset counts from the end.
 *
 * @stability experimental
 * @category slicing
 * @since 4.1.5
 */
export const slice: {
  (offset: number, length?: number): <R>(self: Query<R>) => Query<R>
  <R>(self: Query<R>, offset: number, length?: number): Query<R>
} = dual(
  (args) => isQuery(args[0]),
  <R>(self: Query<R>, offset: number, length?: number): Query<R> =>
    make({ _tag: "Slice", input: self.plan, offset, length })
)

/**
 * The first `n` rows.
 *
 * @stability experimental
 * @category slicing
 * @since 4.1.5
 */
export const head: {
  (n: number): <R>(self: Query<R>) => Query<R>
  <R>(self: Query<R>, n: number): Query<R>
} = dual(2, <R>(self: Query<R>, n: number): Query<R> => slice(self, 0, Math.max(0, n)))

/**
 * The last `n` rows.
 *
 * @stability experimental
 * @category slicing
 * @since 4.1.5
 */
export const tail: {
  (n: number): <R>(self: Query<R>) => Query<R>
  <R>(self: Query<R>, n: number): Query<R>
} = dual(2, <R>(self: Query<R>, n: number): Query<R> => n <= 0 ? slice(self, 0, 0) : slice(self, -n))

/**
 * Keeps the first row of every distinct combination of the given columns
 * (all columns by default).
 *
 * @stability experimental
 * @category filtering
 * @since 4.1.5
 */
export const unique: {
  <R>(columns?: ReadonlyArray<keyof R & string>): (self: Query<R>) => Query<R>
  <R>(self: Query<R>, columns?: ReadonlyArray<keyof R & string>): Query<R>
} = dual(
  (args) => isQuery(args[0]),
  <R>(self: Query<R>, columns?: ReadonlyArray<keyof R & string>): Query<R> =>
    make({ _tag: "Unique", input: self.plan, columns })
)

/**
 * Removes the rows that are `null` in any of the given columns (all
 * columns by default).
 *
 * @stability experimental
 * @category filtering
 * @since 4.1.5
 */
export const dropNulls: {
  <R, const K extends keyof R & string = keyof R & string>(
    columns?: ReadonlyArray<K>
  ): (self: Query<R>) => Query<Simplify<Omit<R, K> & { [P in K]: NonNullable<R[P]> }>>
  <R, const K extends keyof R & string = keyof R & string>(
    self: Query<R>,
    columns?: ReadonlyArray<K>
  ): Query<Simplify<Omit<R, K> & { [P in K]: NonNullable<R[P]> }>>
} = dual(
  (args) => isQuery(args[0]),
  <R>(self: Query<R>, columns?: ReadonlyArray<string>) => make({ _tag: "DropNulls", input: self.plan, columns })
)

/**
 * The rows of every query, one after the other. The queries must have the
 * same columns.
 *
 * @stability experimental
 * @category combining
 * @since 4.1.5
 */
export const concat = <R>(queries: readonly [Query<R>, ...Array<Query<R>>]): Query<R> =>
  make({ _tag: "Concat", inputs: queries.map((q) => q.plan) })

/**
 * The rows of `self`, then the rows of `that`.
 *
 * @stability experimental
 * @category combining
 * @since 4.1.5
 */
export const append: {
  <R>(that: Query<R>): (self: Query<R>) => Query<R>
  <R>(self: Query<R>, that: Query<R>): Query<R>
} = dual(2, <R>(self: Query<R>, that: Query<R>) => concat([self, that]))

// -----------------------------------------------------------------------------
// Columns
// -----------------------------------------------------------------------------

/**
 * Keeps the given columns, in the given order.
 *
 * @stability experimental
 * @category columns
 * @since 4.1.5
 */
export const pick: {
  <R, const K extends ReadonlyArray<keyof R & string>>(
    ...names: K
  ): (self: Query<R>) => Query<Simplify<Pick<R, K[number]>>>
} = (...names: ReadonlyArray<string>) => (self: Query<unknown>) =>
  make({ _tag: "Pick", input: self.plan, columns: names }) as any

/**
 * Removes the given columns.
 *
 * @stability experimental
 * @category columns
 * @since 4.1.5
 */
export const omit: {
  <R, const K extends ReadonlyArray<keyof R & string>>(
    ...names: K
  ): (self: Query<R>) => Query<Simplify<Omit<R, K[number]>>>
} = (...names: ReadonlyArray<string>) => (self: Query<unknown>) =>
  make({ _tag: "Omit", input: self.plan, columns: names }) as any

/**
 * Renames columns: `{ old: "new" }`.
 *
 * @stability experimental
 * @category columns
 * @since 4.1.5
 */
export const rename: {
  <R, const M extends { readonly [K in keyof R]?: string }>(
    mapping: M
  ): (self: Query<R>) => Query<
    Simplify<Omit<R, keyof M> & { [K in keyof M & keyof R as M[K] extends string ? M[K] : never]: R[K] }>
  >
  <R, const M extends { readonly [K in keyof R]?: string }>(
    self: Query<R>,
    mapping: M
  ): Query<Simplify<Omit<R, keyof M> & { [K in keyof M & keyof R as M[K] extends string ? M[K] : never]: R[K] }>>
} = dual(
  2,
  (self: Query<unknown>, mapping: { readonly [name: string]: string | undefined }) => {
    const defined: { [name: string]: string } = {}
    for (const [from, to] of Object.entries(mapping)) if (to !== undefined) defined[from] = to
    return make({ _tag: "Rename", input: self.plan, mapping: defined })
  }
)

/**
 * Replaces the columns with the given expressions; the record's keys name
 * the new columns.
 *
 * @stability experimental
 * @category columns
 * @since 4.1.5
 */
export const select: {
  <R, O extends { readonly [name: string]: Expr.Expr<any> }>(
    f: (columns: Columns<R>) => O
  ): (self: Query<R>) => Query<Simplify<{ [K in keyof O]: Expr.Type<O[K]> }>>
  <R, O extends { readonly [name: string]: Expr.Expr<any> }>(
    self: Query<R>,
    f: (columns: Columns<R>) => O
  ): Query<Simplify<{ [K in keyof O]: Expr.Type<O[K]> }>>
} = dual(
  2,
  (self: Query<unknown>, f: (columns: any) => { readonly [name: string]: unknown }) =>
    make({ _tag: "Select", input: self.plan, columns: named(f(columns)) })
)

/**
 * Adds columns, or replaces columns of the same name in place.
 *
 * @stability experimental
 * @category columns
 * @since 4.1.5
 */
export const withColumns: {
  <R, O extends { readonly [name: string]: Expr.Expr<any> }>(
    f: (columns: Columns<R>) => O
  ): (self: Query<R>) => Query<Simplify<Omit<R, keyof O> & { [K in keyof O]: Expr.Type<O[K]> }>>
  <R, O extends { readonly [name: string]: Expr.Expr<any> }>(
    self: Query<R>,
    f: (columns: Columns<R>) => O
  ): Query<Simplify<Omit<R, keyof O> & { [K in keyof O]: Expr.Type<O[K]> }>>
} = dual(
  2,
  (self: Query<unknown>, f: (columns: any) => { readonly [name: string]: unknown }) =>
    make({ _tag: "WithColumns", input: self.plan, columns: named(f(columns)) })
)

// -----------------------------------------------------------------------------
// Grouping
// -----------------------------------------------------------------------------

/**
 * Groups rows by the given key columns; finish with {@link agg}.
 *
 * @stability experimental
 * @category grouping
 * @since 4.1.5
 */
export const groupBy: {
  <R, const K extends ReadonlyArray<keyof R & string>>(...keys: K): (self: Query<R>) => GroupBy<R, K[number]>
} = (...keys: ReadonlyArray<string>) => (self: Query<unknown>) => ({ _tag: "GroupBy", query: self, keys }) as any

/**
 * Computes aggregates per group: one row per distinct key, in order of first
 * appearance, with the key columns first.
 *
 * @stability experimental
 * @category grouping
 * @since 4.1.5
 */
export const agg: {
  <R, K extends keyof R, O extends { readonly [name: string]: Expr.Aggregate<any> }>(
    f: (columns: Columns<R>) => O
  ): (self: GroupBy<R, K>) => Query<Simplify<Pick<R, K> & { [P in keyof O]: Expr.Type<O[P]> }>>
  <R, K extends keyof R, O extends { readonly [name: string]: Expr.Aggregate<any> }>(
    self: GroupBy<R, K>,
    f: (columns: Columns<R>) => O
  ): Query<Simplify<Pick<R, K> & { [P in keyof O]: Expr.Type<O[P]> }>>
} = dual(
  (args) => isGroupBy(args[0]),
  (self: GroupBy<unknown, never>, f: (columns: any) => { readonly [name: string]: unknown }) =>
    make({
      _tag: "GroupBy",
      input: self.query.plan,
      keys: self.keys as ReadonlyArray<string>,
      aggregates: named(f(columns))
    })
)

/**
 * Computes aggregates over all rows: a table of one row.
 *
 * @stability experimental
 * @category grouping
 * @since 4.1.5
 */
export const aggregate: {
  <R, O extends { readonly [name: string]: Expr.Aggregate<any> }>(
    f: (columns: Columns<R>) => O
  ): (self: Query<R>) => Query<Simplify<{ [P in keyof O]: Expr.Type<O[P]> }>>
  <R, O extends { readonly [name: string]: Expr.Aggregate<any> }>(
    self: Query<R>,
    f: (columns: Columns<R>) => O
  ): Query<Simplify<{ [P in keyof O]: Expr.Type<O[P]> }>>
} = dual(
  2,
  (self: Query<unknown>, f: (columns: any) => { readonly [name: string]: unknown }) =>
    make({ _tag: "Aggregate", input: self.plan, aggregates: named(f(columns)) })
)

// -----------------------------------------------------------------------------
// Joins
// -----------------------------------------------------------------------------

/**
 * Joins `that` onto `self` by equal key columns. Output rows keep the left
 * row order; several right matches follow in their order. The non-key
 * columns of the two sides must have different names.
 *
 * @stability experimental
 * @category combining
 * @since 4.1.5
 */
export const join: {
  <R, R2, const On extends keyof R & keyof R2 & string, const How extends JoinHow = "inner">(
    that: Query<R2>,
    options: { readonly on: On | ReadonlyArray<On>; readonly how?: How | undefined } & JoinCheck<R, R2, On>
  ): (self: Query<R>) => Query<Joined<R, R2, On, How>>
  <R, R2, const On extends keyof R & keyof R2 & string, const How extends JoinHow = "inner">(
    self: Query<R>,
    that: Query<R2>,
    options: { readonly on: On | ReadonlyArray<On>; readonly how?: How | undefined } & JoinCheck<R, R2, On>
  ): Query<Joined<R, R2, On, How>>
} = dual(
  3,
  (
    self: Query<unknown>,
    that: Query<unknown>,
    options: { readonly on: string | ReadonlyArray<string>; readonly how?: JoinHow | undefined }
  ) =>
    make({
      _tag: "Join",
      left: self.plan,
      right: that.plan,
      on: typeof options.on === "string" ? [options.on] : options.on,
      how: options.how ?? "inner"
    })
) as any

// -----------------------------------------------------------------------------
// Reshaping
// -----------------------------------------------------------------------------

/**
 * The value type of a pivot cell for an aggregate of values of type `A`.
 *
 * @stability experimental
 * @category type-level
 * @since 4.1.5
 */
export type PivotCell<A, F extends Plan.PivotAggregate> = F extends "len" | "count" | "countDistinct" ? number
  : F extends "sum" ? (NonNullable<A> extends bigint ? bigint
      : NonNullable<A> extends BigDecimal.BigDecimal ? BigDecimal.BigDecimal
      : number)
  : F extends "mean" | "median" | "std" | "variance" ? number | null
  : NonNullable<A> | null

interface PivotOptions<R, On, Index, Values, F> {
  /** The column whose distinct values become columns. */
  readonly on: On
  /** The columns whose distinct combinations become rows. */
  readonly index: Index
  /** The column aggregated into the cells. */
  readonly values: Values
  /** The aggregate of each cell. */
  readonly aggregate: F
  readonly "~row"?: R
}

/**
 * One row per distinct `index`, one column per distinct value of `on`, and
 * in each cell the `aggregate` of `values` over the rows with that index and
 * value (`Plan.Pivot` has the details).
 *
 * **Details**
 *
 * Without `columns`, the output columns depend on the data, so the rows are
 * untyped. With `columns`, the output has exactly those value columns, in
 * that order, and is typed.
 *
 * **Example** (Units per region and quarter)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DataFrame, Query } from "effect/dataframe"
 *
 * const sales = DataFrame.fromColumns({
 *   region: ["north", "north", "south"],
 *   quarter: ["q1", "q2", "q1"],
 *   units: [10, 20, 5]
 * })
 *
 * const rows = Query.from(sales).pipe(
 *   Query.pivot({ on: "quarter", index: ["region"], values: "units", aggregate: "sum", columns: ["q1", "q2"] }),
 *   Effect.map(DataFrame.toRows),
 *   Effect.runSync
 * )
 * rows // => [{ region: "north", q1: 10, q2: 20 }, { region: "south", q1: 5, q2: 0 }]
 * ```
 *
 * @stability experimental
 * @category reshaping
 * @since 4.1.5
 */
export const pivot: {
  <
    R,
    const On extends keyof R & string,
    const Index extends ReadonlyArray<keyof R & string>,
    const Values extends keyof R & string,
    const F extends Plan.PivotAggregate,
    const Columns extends ReadonlyArray<string>
  >(
    options: PivotOptions<R, On, Index, Values, F> & { readonly columns: Columns }
  ): (
    self: Query<R>
  ) => Query<Simplify<Pick<R, Index[number]> & { readonly [C in Columns[number]]: PivotCell<R[Values], F> }>>
  <
    R,
    const On extends keyof R & string,
    const Index extends ReadonlyArray<keyof R & string>,
    const Values extends keyof R & string,
    const F extends Plan.PivotAggregate
  >(
    options: PivotOptions<R, On, Index, Values, F>
  ): (self: Query<R>) => Query<{ readonly [name: string]: unknown }>
  <
    R,
    const On extends keyof R & string,
    const Index extends ReadonlyArray<keyof R & string>,
    const Values extends keyof R & string,
    const F extends Plan.PivotAggregate,
    const Columns extends ReadonlyArray<string>
  >(
    self: Query<R>,
    options: PivotOptions<R, On, Index, Values, F> & { readonly columns: Columns }
  ): Query<Simplify<Pick<R, Index[number]> & { readonly [C in Columns[number]]: PivotCell<R[Values], F> }>>
  <
    R,
    const On extends keyof R & string,
    const Index extends ReadonlyArray<keyof R & string>,
    const Values extends keyof R & string,
    const F extends Plan.PivotAggregate
  >(
    self: Query<R>,
    options: PivotOptions<R, On, Index, Values, F>
  ): Query<{ readonly [name: string]: unknown }>
} = dual(2, (self: Query<unknown>, options: {
  readonly on: string
  readonly index: ReadonlyArray<string>
  readonly values: string
  readonly aggregate: Plan.PivotAggregate
  readonly columns?: ReadonlyArray<string>
}) =>
  make({
    _tag: "Pivot",
    input: self.plan,
    on: options.on,
    index: options.index,
    values: options.values,
    aggregate: options.aggregate,
    columns: options.columns
  })) as any

/**
 * Stacks the `on` columns into one `value` column (`"value"` by default),
 * one block of rows per column, with the column's name in `variable`
 * (`"variable"` by default) and the `index` columns repeated. The values
 * take the common type of the stacked columns.
 *
 * @stability experimental
 * @category reshaping
 * @since 4.1.5
 */
export const unpivot: {
  <
    R,
    const On extends ReadonlyArray<keyof R & string>,
    const Index extends ReadonlyArray<keyof R & string> = readonly [],
    const Variable extends string = "variable",
    const Value extends string = "value"
  >(options: {
    readonly on: On
    readonly index?: Index | undefined
    readonly variable?: Variable | undefined
    readonly value?: Value | undefined
  }): (
    self: Query<R>
  ) => Query<
    Simplify<
      & Pick<R, Index[number]>
      & { readonly [K in Variable]: On[number] }
      & { readonly [K in Value]: R[On[number]] }
    >
  >
  <
    R,
    const On extends ReadonlyArray<keyof R & string>,
    const Index extends ReadonlyArray<keyof R & string> = readonly [],
    const Variable extends string = "variable",
    const Value extends string = "value"
  >(self: Query<R>, options: {
    readonly on: On
    readonly index?: Index | undefined
    readonly variable?: Variable | undefined
    readonly value?: Value | undefined
  }): Query<
    Simplify<
      & Pick<R, Index[number]>
      & { readonly [K in Variable]: On[number] }
      & { readonly [K in Value]: R[On[number]] }
    >
  >
} = dual(2, (self: Query<unknown>, options: {
  readonly on: ReadonlyArray<string>
  readonly index?: ReadonlyArray<string> | undefined
  readonly variable?: string | undefined
  readonly value?: string | undefined
}) =>
  make({
    _tag: "Unpivot",
    input: self.plan,
    index: options.index ?? [],
    on: options.on,
    variable: options.variable ?? "variable",
    value: options.value ?? "value"
  })) as any

/**
 * One row per element of the list column `column`, the other columns
 * repeated. A null list gives one row with a null element; an empty list
 * gives no rows.
 *
 * @stability experimental
 * @category reshaping
 * @since 4.1.5
 */
export const explode: {
  <R, const K extends ListKeys<R>>(
    column: K
  ): (self: Query<R>) => Query<Simplify<{ readonly [P in keyof R]: P extends K ? ElementOf<R[P]> | null : R[P] }>>
  <R, const K extends ListKeys<R>>(
    self: Query<R>,
    column: K
  ): Query<Simplify<{ readonly [P in keyof R]: P extends K ? ElementOf<R[P]> | null : R[P] }>>
} = dual(2, (self: Query<unknown>, column: string) => make({ _tag: "Explode", input: self.plan, column })) as any

/**
 * The fields of the struct column `column` as columns, in its place; they
 * are null where the struct is null.
 *
 * @stability experimental
 * @category reshaping
 * @since 4.1.5
 */
export const unnest: {
  <R, const K extends StructKeys<R>>(
    column: K
  ): (self: Query<R>) => Query<Simplify<Omit<R, K> & Fields<R[K]>>>
  <R, const K extends StructKeys<R>>(self: Query<R>, column: K): Query<Simplify<Omit<R, K> & Fields<R[K]>>>
} = dual(2, (self: Query<unknown>, column: string) => make({ _tag: "Unnest", input: self.plan, column })) as any

type ListKeys<R> = {
  [K in keyof R & string]: NonNullable<R[K]> extends ReadonlyArray<unknown> ? K : never
}[keyof R & string]
type ElementOf<A> = NonNullable<A> extends ReadonlyArray<infer E> ? E : never
type StructKeys<R> = {
  [K in keyof R & string]: NonNullable<R[K]> extends ReadonlyArray<unknown> ? never
    : NonNullable<R[K]> extends object ? K
    : never
}[keyof R & string]
type Fields<A> = null extends A ? { readonly [K in keyof NonNullable<A>]: NonNullable<A>[K] | null }
  : { readonly [K in keyof NonNullable<A>]: NonNullable<A>[K] }
