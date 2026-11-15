/**
 * Running queries on PostgreSQL: plans compiled to SQL and run through the
 * `effect/sql` client in the context.
 *
 * **Mental model**
 *
 * - {@link compile} turns a plan into one SQL query whose rows come back in
 *   the plan's row order: stable sorts, groups in order of first appearance,
 *   joins in left row order, as the in-memory engine.
 * - {@link layer} provides an `Engine` that compiles every query and runs it
 *   with the `SqlClient` in the context, so `yield* query` reads from the
 *   database. `Query.table` names become table names.
 * - The SQL is PostgreSQL's (PGlite included); other databases are future
 *   work.
 *
 * **Example** (Compiling a query)
 *
 * ```ts import.meta.vitest
 * import { Result, Schema } from "effect"
 * import { Expr, Query, Sql } from "effect/dataframe"
 *
 * const Trip = Schema.Struct({ city: Schema.String, km: Schema.Number })
 * const query = Query.table("trips", Trip).pipe(
 *   Query.filter((c) => Expr.gt(c.km, 10)),
 *   Query.groupBy("city"),
 *   Query.agg((c) => ({ total: Expr.sum(c.km) }))
 * )
 *
 * const compiled = Result.getOrThrow(Sql.compile(query.plan))
 * compiled.schema.fields.map((f) => f.name) // => ["city", "total"]
 * ```
 *
 * **Details**
 *
 * Results have the column types the in-memory engine gives for the same
 * plan (see {@link Compiled}). Values follow the database's semantics where
 * they differ from the in-memory engine's: integer overflow raises an error
 * instead of wrapping, division by zero follows the database, string order
 * follows its collation, and timestamps and durations keep PostgreSQL's
 * microseconds (finer timestamps round down, finer durations toward zero). Pivots, unpivots, `explode` and
 * `unnest` are not supported yet; tables need declared columns
 * (`Query.table` with a schema), and {@link engine} checks that tables
 * satisfy them, as the in-memory engine does.
 *
 * @stability experimental
 * @since 4.1.5
 */
import type * as ArrowSchema from "../arrow/ArrowSchema.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Result from "../Result.ts"
import { SqlClient } from "../sql/SqlClient.ts"
import * as Stream from "../Stream.ts"
import { DataFrameError } from "./DataFrame.ts"
import type { DataFrame } from "./DataFrame.ts"
import { Engine } from "./Engine.ts"
import * as internal from "./internal/sql.ts"
import * as V from "./internal/vector.ts"
import type * as Plan from "./Plan.ts"

/**
 * A compiled plan: the query, and the schema of its result.
 *
 * **Details**
 *
 * The schema has the column types the in-memory engine gives for the same
 * plan, whatever the database's own types are; every field is nullable. The
 * query renders each column in a form {@link engine} reads back as that
 * type, so its raw rows are meant for that decoding rather than for direct
 * use.
 *
 * **Gotchas**
 *
 * The query doesn't check that the tables satisfy their declared columns and
 * schemas: {@link engine} runs a query that checks the rows it reads
 * instead.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Compiled {
  readonly sql: string
  readonly schema: ArrowSchema.Schema
}

/** The messages of an error and its causes, outermost first, without repeats. */
const toError = (cause: unknown) => {
  const messages: Array<string> = []
  for (let c: unknown = cause; c instanceof Error && messages.length < 8; c = c.cause) {
    if (c.message !== "" && !messages.includes(c.message)) messages.push(c.message)
  }
  return new DataFrameError({ message: messages.length === 0 ? String(cause) : messages.join(": "), cause })
}

/**
 * Compiles a plan to one PostgreSQL query. Fails for operations the SQL
 * engine doesn't support.
 *
 * @stability experimental
 * @category compiling
 * @since 4.1.5
 */
export const compile = (plan: Plan.Node): Result.Result<Compiled, DataFrameError> =>
  Result.map(attempt(() => internal.compile(plan)), ({ schema, sql }) => ({ sql, schema }))

const attempt = <A>(f: () => A): Result.Result<A, DataFrameError> => {
  try {
    return Result.succeed(f())
  } catch (cause) {
    if (cause instanceof V.DataFrameDefect) return Result.fail(toError(cause))
    throw cause
  }
}

/**
 * An engine that compiles queries to SQL and runs them with the
 * `SqlClient` in the context.
 *
 * **Details**
 *
 * Tables must satisfy their declared columns and schemas, as with the
 * in-memory engine, or the query fails. First the engine queries the
 * PostgreSQL types of the declared columns: `smallint` or `integer` for
 * integers up to 32 bits, `bigint` for 64-bit ones, `smallint`,
 * `integer`, `real` or `double precision` for floats, string or enum
 * types for strings, `bytea`, `boolean`, `date`, `timestamp` or
 * `timestamptz` (read as UTC), `interval`, `numeric` for decimals, and
 * any type for `Null` columns. Then one query reads each table once, as a
 * `MATERIALIZED` common table expression (computed once per statement),
 * checks those rows and computes the result from exactly them, whatever
 * the relation: views that sample rows or call functions included, and a
 * table read twice gives the same rows twice. The checks: only nulls in
 * `Null` columns, no nulls in other non-nullable columns, values their
 * declared types hold exactly (integers in range, numbers that `Float32`
 * holds, decimals within their precision, scale and 64-bit storage, finite
 * dates, timestamps and durations in whole units), timestamps in the range
 * of `DateTime`, intervals without months, and the distinct values of the
 * columns the schema constrains beyond their type (literals, enums,
 * refinements) accepted by the schema. Columns the query doesn't read are
 * checked too. The query reads every column as its declared type: strings,
 * enums and `char(n)` as text (`char(n)` without trailing spaces, as
 * PostgreSQL converts it), numbers as the PostgreSQL type of their
 * declared type. `explain` shows both queries. Tables whose schemas have
 * checks on whole rows are rejected when the query compiles.
 *
 * **Gotchas**
 *
 * Every query reads all rows of its tables, which the checks need, and
 * copies their declared columns once: filters can't use the tables'
 * indexes. The column types are checked in a separate
 * statement first: run both inside a `REPEATABLE READ` transaction when
 * the tables may be altered concurrently.
 *
 * @stability experimental
 * @category engines
 * @since 4.1.5
 */
export const engine: Effect.Effect<Engine.Service, never, SqlClient> = Effect.gen(function*() {
  const sql = yield* SqlClient
  const compiled = (plan: Plan.Node) => Effect.fromResult(attempt(() => internal.compile(plan)))
  const run = (query: string) => sql.unsafe(query).values.pipe(Effect.mapError(toError))
  const collect = (plan: Plan.Node): Effect.Effect<DataFrame<unknown>, DataFrameError> =>
    Effect.gen(function*() {
      const query = yield* compiled(plan)
      if (query.types !== undefined) {
        const types = query.types
        const rows = yield* run(types.sql)
        yield* Effect.fromResult(attempt(() => internal.verify(types, rows)))
      }
      const rows = yield* run(query.query.sql)
      return yield* Effect.try({
        try: () => internal.read(query, rows) as unknown as DataFrame<unknown>,
        catch: toError
      })
    })
  return {
    name: "sql (postgres)",
    collect,
    stream: (plan) => Stream.fromEffect(collect(plan)),
    explain: (plan) =>
      Effect.map(compiled(plan), (c) => [...(c.types === undefined ? [] : [c.types.sql]), c.query.sql].join(";\n"))
  } satisfies Engine.Service
})

/**
 * A layer that runs queries on the database of the `SqlClient` in the
 * context, with {@link engine}: each query reads its tables once, checks
 * those rows against their declared columns and schemas, and computes its
 * result from exactly those rows.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layer: Layer.Layer<never, never, SqlClient> = Layer.effect(Engine, engine)
