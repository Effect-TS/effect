import { SqlClient, Statement } from "@effect/sql"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Logger } from "effect"
import { MysqlContainer } from "./utils.js"

const SqlLogger = Statement.setTransformer((statement) => {
  const [query, params] = statement.compile()
  return Effect.log("executing sql").pipe(
    Effect.annotateLogs({ query, params }),
    Effect.as(statement)
  )
})

describe("sql", () => {
  it.effect("tranformers", () =>
    Effect.gen(function*() {
      const logs: Array<unknown> = []
      const sql = yield* SqlClient.SqlClient
      const result = yield* sql<{ result: number }>`SELECT 1 + 1 AS result`.pipe(
        Effect.provide(Logger.replace(
          Logger.defaultLogger,
          Logger.make((log) => {
            logs.push(log.message)
          })
        ))
      )
      assert.deepStrictEqual(result, [{ result: 2 }])
      assert.deepStrictEqual(logs, [["executing sql"]])
    }).pipe(
      Effect.provide(MysqlContainer.ClientLive.pipe(
        Layer.provide(SqlLogger)
      )),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })
})
