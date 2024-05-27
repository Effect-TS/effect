import * as DevTools from "@effect/experimental/DevTools"
import { NodeFileSystem } from "@effect/platform-node"
import * as Mssql from "@effect/sql-mssql"
import { Config, Effect, Layer, Logger, LogLevel, Redacted, String } from "effect"
import { pipe } from "effect/Function"
import { fileURLToPath } from "node:url"

const peopleProcedure = pipe(
  Mssql.procedure.make("people_proc"),
  Mssql.procedure.param<string>()("name", Mssql.types.VarChar),
  Mssql.procedure.withRows<{ readonly id: number; readonly name: string }>(),
  Mssql.procedure.compile
)

const program = Effect.gen(function*(_) {
  const sql = yield* _(Mssql.client.MssqlClient)

  yield* _(
    sql`
      CREATE OR ALTER PROC people_proc
        @name VARCHAR(255)
      AS
      BEGIN
        SELECT * FROM people WHERE name = @name
      END
    `
  )

  // Insert
  const [inserted] = yield* _(
    sql`INSERT INTO ${sql("people")} ${
      sql.insert({
        name: "Tim",
        createdAt: new Date()
      })
    }`
  )
  console.log(inserted)

  console.log(
    yield* _(
      Effect.all(
        [
          sql`SELECT TOP 3 * FROM ${sql("people")}`,
          sql`SELECT TOP 3 * FROM ${sql("people")}`.values,
          sql`SELECT TOP 3 * FROM ${sql("people")}`.withoutTransform,
          sql.call(peopleProcedure({ name: "Tim" }))
        ],
        { concurrency: "unbounded" }
      )
    )
  )

  console.log(
    yield* _(sql`
      UPDATE people
      SET name = data.name
      OUTPUT inserted.*
      FROM ${sql.updateValues([{ ...inserted, name: "New name" }], "data")}
      WHERE people.id = data.id
    `)
  )

  console.log(
    yield* _(
      sql`SELECT TOP 3 * FROM ${sql("people")}`,
      Effect.zipRight(
        Effect.catchAllCause(
          sql.withTransaction(Effect.die("fail")),
          (_) => Effect.void
        )
      ),
      Effect.zipRight(
        sql.withTransaction(sql`SELECT TOP 3 * FROM ${sql("people")}`)
      ),
      sql.withTransaction
    )
  )
})

const SqlLive = Mssql.migrator.layer({
  loader: Mssql.migrator.fromFileSystem(
    fileURLToPath(new URL("./migrations", import.meta.url))
  )
}).pipe(
  Layer.provideMerge(
    Mssql.client.layer({
      database: Config.succeed("msdb"),
      server: Config.succeed("localhost"),
      username: Config.succeed("sa"),
      password: Config.succeed(Redacted.make("Sq1Fx_password")),
      transformQueryNames: Config.succeed(String.camelToSnake),
      transformResultNames: Config.succeed(String.snakeToCamel)
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
