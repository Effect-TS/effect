import * as DevTools from "@effect/experimental/DevTools"
import * as Sql from "@effect/sql"
import * as Mysql from "@effect/sql-mysql2"
import { Config, Effect, FiberRef, FiberRefs, Layer, Option, Redacted, String } from "effect"

const currentResourceName = FiberRef.unsafeMake("")

const SqlTracingLive = Sql.statement.setTransformer((prev, sql, refs, span) => {
  const [query, params] = prev.compile()
  return sql.unsafe(
    `/* ${
      JSON.stringify({
        trace_id: span.traceId,
        span_id: span.spanId,
        resource_name: Option.getOrUndefined(FiberRefs.get(refs, currentResourceName))
      })
    } */ ${query}`,
    params
  )
})

const EnvLive = Mysql.client.layer({
  database: Config.succeed("effect_dev"),
  username: Config.succeed("effect"),
  password: Config.succeed(Redacted.make("password")),
  transformQueryNames: Config.succeed(String.camelToSnake),
  transformResultNames: Config.succeed(String.snakeToCamel)
}).pipe(
  Layer.provide(SqlTracingLive),
  Layer.provide(DevTools.layer())
)

const program = Effect.gen(function*(_) {
  const sql = yield* _(Sql.client.Client)
  yield* _(
    sql`SELECT * FROM people`,
    Effect.replicateEffect(50),
    sql.withTransaction,
    Effect.locally(currentResourceName, "GET /people")
  )
})

program.pipe(
  Effect.provide(EnvLive),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
