import * as DevTools from "@effect/experimental/DevTools"
import { NodeFileSystem } from "@effect/platform-node"
import { MssqlClient, MssqlMigrator, MssqlTypes, Procedure } from "@effect/sql-mssql"
import { Effect, Layer, Logger, LogLevel, Redacted, String } from "effect"
import { pipe } from "effect/Function"
import { fileURLToPath } from "node:url"

const peopleProcedure = pipe(
  Procedure.make("people_proc"),
  Procedure.param<string>()("name", MssqlTypes.VarChar),
  Procedure.withRows<{ readonly id: number; readonly name: string }>(),
  Procedure.compile
)

const program = Effect.gen(function*() {
  const sql = yield* MssqlClient.MssqlClient

  yield* sql`
      CREATE OR ALTER PROC people_proc
        @name VARCHAR(255)
      AS
      BEGIN
        SELECT * FROM people WHERE name = @name
      END
    `

  // Insert
  const [inserted] = yield* sql`INSERT INTO ${sql("people")} ${
    sql.insert({
      name: "Tim",
      createdAt: new Date()
    }).returning("*")
  }`

  console.log(inserted)

  console.log(
    yield* Effect.all(
      [
        sql`SELECT TOP(3) * FROM ${sql("people")}`,
        sql`SELECT TOP(3) * FROM ${sql("people")}`.values,
        sql`SELECT TOP(3) * FROM ${sql("people")}`.withoutTransform,
        sql.call(peopleProcedure({ name: "Tim" }))
      ],
      { concurrency: "unbounded" }
    )
  )

  console.log(
    yield* sql`
      UPDATE people
      SET name = data.name
      ${sql.updateValues([{ ...inserted, name: "New name" }], "data").returning("*")}
      WHERE people.id = data.id
    `
  )

  console.log(
    yield* pipe(
      sql`SELECT TOP(3) * FROM ${sql("people")}`,
      Effect.zipRight(
        Effect.catchAllCause(
          sql.withTransaction(Effect.die("fail")),
          (_) => Effect.void
        )
      ),
      Effect.zipRight(
        sql.withTransaction(sql`SELECT TOP(3) * FROM ${sql("people")}`)
      ),
      sql.withTransaction
    )
  )
})

const SqlLive = MssqlMigrator.layer({
  loader: MssqlMigrator.fromFileSystem(
    fileURLToPath(new URL("./migrations", import.meta.url))
  )
}).pipe(
  Layer.provideMerge(
    MssqlClient.layer({
      database: "msdb",
      server: "localhost",
      username: "sa",
      password: Redacted.make("Sq1Fx_password"),
      transformQueryNames: String.camelToSnake,
      transformResultNames: String.snakeToCamel
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
