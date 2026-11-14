/**
 * Running queries on a database: plans compiled to SQL and run through the
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
 * - Two dialects: `postgres` (PostgreSQL, PGlite) and `duckdb`.
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
 * const compiled = Result.getOrThrow(Sql.compile(query.plan, { dialect: "postgres" }))
 * compiled.columns // => ["city", "total"]
 * ```
 *
 * **Details**
 *
 * Values follow the database's semantics where they differ from the
 * in-memory engine's: integer overflow raises an error instead of wrapping,
 * division by zero follows the database, string order follows its collation
 * (binary in DuckDB), `round` rounds half away from zero in PostgreSQL, and
 * `min`/`max` of floats treat NaN as the largest value. Pivots, unpivots,
 * `explode` and `unnest` are not supported yet; tables need declared
 * columns (`Query.table` with a schema).
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as DateTime from "../DateTime.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Result from "../Result.ts"
import { SqlClient } from "../sql/SqlClient.ts"
import * as Stream from "../Stream.ts"
import { DataFrameError, fromColumns } from "./DataFrame.ts"
import type { DataFrame } from "./DataFrame.ts"
import { Engine } from "./Engine.ts"
import * as internal from "./internal/sql.ts"
import * as V from "./internal/vector.ts"
import type * as Plan from "./Plan.ts"

/**
 * The SQL dialects plans compile to.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Dialect = "duckdb" | "postgres"

/**
 * A compiled plan: the query, and the names of its result columns in order.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Compiled {
  readonly sql: string
  readonly columns: ReadonlyArray<string>
}

const toError = (cause: unknown) =>
  new DataFrameError({ message: cause instanceof Error ? cause.message : String(cause), cause })

/**
 * Compiles a plan to one SQL query (dialect `postgres` by default). Fails
 * for operations the SQL engine doesn't support.
 *
 * @stability experimental
 * @category compiling
 * @since 4.1.5
 */
export const compile = (
  plan: Plan.Node,
  options?: { readonly dialect?: Dialect | undefined }
): Result.Result<Compiled, DataFrameError> => {
  try {
    return Result.succeed(internal.compile(plan, options?.dialect ?? "postgres"))
  } catch (cause) {
    if (cause instanceof V.DataFrameDefect) return Result.fail(toError(cause))
    throw cause
  }
}

const frameOf = (columns: ReadonlyArray<string>, rows: ReadonlyArray<Record<string, unknown>>): DataFrame<unknown> => {
  const data: Record<string, Array<unknown>> = {}
  // Drivers return JS Dates for timestamps and dates.
  const value = (v: unknown) => (v === undefined ? null : v instanceof Date ? DateTime.makeUnsafe(v) : v)
  for (const name of columns) data[name] = rows.map((r) => value(r[name]))
  return fromColumns(data as any) as DataFrame<unknown>
}

/**
 * An engine that compiles queries to SQL and runs them with the
 * `SqlClient` in the context.
 *
 * @stability experimental
 * @category engines
 * @since 4.1.5
 */
export const engine = (options?: { readonly dialect?: Dialect | undefined }): Effect.Effect<
  Engine.Service,
  never,
  SqlClient
> =>
  Effect.gen(function*() {
    const sql = yield* SqlClient
    const dialect = options?.dialect ?? "postgres"
    const compiled = (plan: Plan.Node) => Effect.fromResult(compile(plan, { dialect }))
    const collect = (plan: Plan.Node): Effect.Effect<DataFrame<unknown>, DataFrameError> =>
      Effect.gen(function*() {
        const query = yield* compiled(plan)
        const rows = yield* sql.unsafe<Record<string, unknown>>(query.sql).pipe(Effect.mapError(toError))
        return yield* Effect.try({ try: () => frameOf(query.columns, rows), catch: toError })
      })
    return {
      name: `sql (${dialect})`,
      collect,
      stream: (plan) => Stream.fromEffect(collect(plan)),
      explain: (plan) => Effect.map(compiled(plan), (c) => c.sql)
    } satisfies Engine.Service
  })

/**
 * A layer that runs queries on the database of the `SqlClient` in the
 * context.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layer = (options?: { readonly dialect?: Dialect | undefined }): Layer.Layer<never, never, SqlClient> =>
  Layer.effect(Engine, engine(options))
