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
 * instead of wrapping, division by zero follows the database, and string
 * order follows its collation. Pivots, unpivots,
 * `explode` and `unnest` are not supported yet; tables need declared
 * columns (`Query.table` with a schema).
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
export const compile = (plan: Plan.Node): Result.Result<Compiled, DataFrameError> => {
  try {
    return Result.succeed(internal.compile(plan))
  } catch (cause) {
    if (cause instanceof V.DataFrameDefect) return Result.fail(toError(cause))
    throw cause
  }
}

/**
 * An engine that compiles queries to SQL and runs them with the
 * `SqlClient` in the context.
 *
 * @stability experimental
 * @category engines
 * @since 4.1.5
 */
export const engine: Effect.Effect<Engine.Service, never, SqlClient> = Effect.gen(function*() {
  const sql = yield* SqlClient
  const compiled = (plan: Plan.Node) => Effect.fromResult(compile(plan))
  const collect = (plan: Plan.Node): Effect.Effect<DataFrame<unknown>, DataFrameError> =>
    Effect.gen(function*() {
      const query = yield* compiled(plan)
      const rows = yield* sql.unsafe(query.sql).values.pipe(Effect.mapError(toError))
      return yield* Effect.try({
        try: () => internal.decode(query.schema, rows) as unknown as DataFrame<unknown>,
        catch: toError
      })
    })
  return {
    name: "sql (postgres)",
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
export const layer: Layer.Layer<never, never, SqlClient> = Layer.effect(Engine, engine)
