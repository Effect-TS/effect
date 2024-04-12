import * as DevTools from "@effect/experimental/DevTools"
import { NodeFileSystem } from "@effect/platform-node"
import * as Sql from "@effect/sql-mssql"
import { Config, Effect, Layer, Logger, LogLevel, Secret } from "effect"
import { pipe } from "effect/Function"
import { fileURLToPath } from "node:url"

const program = Effect.gen(function*(_) {
  const sql = yield* _(Sql.client.MssqlClient)

  yield* _(
    sql`INSERT INTO ${sql("people")} (name) VALUES ('Alice')`
  )

  const people = yield* _(sql`SELECT * FROM people`)
  console.log(people)
})

const SqlLive = Sql.migrator.layer({
  loader: Sql.migrator.fromFileSystem(
    fileURLToPath(new URL("./migrations", import.meta.url))
  )
}).pipe(
  Layer.provideMerge(
    Sql.client.layer({
      database: Config.succeed("msdb"),
      server: Config.succeed("localhost"),
      username: Config.succeed("sa"),
      password: Config.succeed(Secret.fromString("Sq1Fx_password")),
      transformQueryNames: Config.succeed(Sql.transform.camelToSnake),
      transformResultNames: Config.succeed(Sql.transform.snakeToCamel)
    })
  ),
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(DevTools.layer()),
  Layer.provide(Logger.minimumLogLevel(LogLevel.All))
)

pipe(
  program,
  Effect.provide(SqlLive),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
