import * as DevTools from "@effect/experimental/DevTools"
import { SqlClient, Statement } from "@effect/sql"
import { MysqlClient } from "@effect/sql-mysql2"
import { Config, Effect, FiberRef, FiberRefs, Layer, Option, pipe, Redacted, String } from "effect"

const currentResourceName = FiberRef.unsafeMake("")

const SqlTracingLive = Statement.setTransformer((prev, sql, refs, span) => {
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

const EnvLive = MysqlClient.layer({
  database: Config.succeed("effect_dev"),
  username: Config.succeed("effect"),
  password: Config.succeed(Redacted.make("password")),
  transformQueryNames: Config.succeed(String.camelToSnake),
  transformResultNames: Config.succeed(String.snakeToCamel)
}).pipe(
  Layer.provide(SqlTracingLive),
  Layer.provide(DevTools.layer())
)

const program = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* pipe(
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
