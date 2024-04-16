import * as DevTools from "@effect/experimental/DevTools"
import { NodeFileSystem } from "@effect/platform-node"
import * as Sql from "@effect/sql-mssql"
import { Config, Effect, Layer, Logger, LogLevel, Secret, String } from "effect"
import { pipe } from "effect/Function"
import { fileURLToPath } from "node:url"

const peopleProcedure = pipe(
  Sql.procedure.make("people_proc"),
  Sql.procedure.param<string>()("name", Sql.types.VarChar),
  Sql.procedure.withRows<{ readonly id: number; readonly name: string }>(),
  Sql.procedure.compile
)

const program = Effect.gen(function*(_) {
  const sql = yield* _(Sql.client.MssqlClient)

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
          (_) => Effect.unit
        )
      ),
      Effect.zipRight(
        sql.withTransaction(sql`SELECT TOP 3 * FROM ${sql("people")}`)
      ),
      sql.withTransaction
    )
  )
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
