import * as DevTools from "@effect/experimental/DevTools"
import { SqlClient, Statement } from "@effect/sql"
import { MysqlClient } from "@effect/sql-mysql2"
import { Config, Effect, FiberRef, Layer, pipe, Redacted, String } from "effect"

const currentResourceName = FiberRef.unsafeMake("")

const SqlLoggerLive = Statement.setTransformer((statement) => {
  const [query, params] = statement.compile()
  return Effect.log("executing sql").pipe(
    Effect.annotateLogs({ query, params }),
    Effect.as(statement)
  )
})

const EnvLive = MysqlClient.layer({
  database: Config.succeed("effect_dev"),
  username: Config.succeed("effect"),
  password: Config.succeed(Redacted.make("password")),
  transformQueryNames: Config.succeed(String.camelToSnake),
  transformResultNames: Config.succeed(String.snakeToCamel)
}).pipe(
  Layer.provide(SqlLoggerLive),
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
