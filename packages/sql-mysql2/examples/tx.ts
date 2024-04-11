import * as Sql from "@effect/sql-mysql2"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Secret from "effect/Secret"

const SqlLive = Sql.client.layer({
  database: Config.succeed("effect_dev"),
  username: Config.succeed("effect"),
  password: Config.succeed(Secret.fromString("password")),
  transformQueryNames: Config.succeed(Sql.transform.camelToSnake),
  transformResultNames: Config.succeed(Sql.transform.snakeToCamel)
})

const program = Effect.gen(function*(_) {
  const sql = yield* _(Sql.client.MysqlClient)
  const result = yield* _(
    sql.withTransaction(sql`SELECT * FROM people`),
    sql.withTransaction
  )
  console.log(result)
})

pipe(
  program,
  Effect.provide(SqlLive),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
