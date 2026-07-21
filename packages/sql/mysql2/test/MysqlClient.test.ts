import { MysqlClient } from "@effect/sql-mysql2"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"

import { MysqlContainer } from "./utils.ts"

describe("MysqlClient", () => {
  it.effect("stream returns same rows as direct execution", () =>
    Effect.gen(function*() {
      const sql = yield* MysqlClient.MysqlClient

      yield* sql`DROP TABLE IF EXISTS stream_regression_test`
      yield* sql`CREATE TABLE stream_regression_test (id INT PRIMARY KEY AUTO_INCREMENT, value VARCHAR(255))`

      const testData = Array.from({ length: 100 }, (_, i) => ({ value: `row_${i}` }))
      yield* sql`INSERT INTO stream_regression_test ${sql.insert(testData)}`

      const directResults = yield* sql`SELECT * FROM stream_regression_test`

      const streamResults = yield* Stream.runCollect(
        sql`SELECT * FROM stream_regression_test`.stream
      )

      yield* sql`DROP TABLE stream_regression_test`

      assert.strictEqual(
        streamResults.length,
        directResults.length,
        `Stream returned ${streamResults.length} rows, expected ${directResults.length}`
      )
    }).pipe(
      Effect.provide(MysqlContainer.layerClient),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })

  it.effect(
    "disablePreparedStatements runs parameterized statements over the text protocol",
    () =>
      Effect.gen(function*() {
        const container = yield* MysqlContainer
        const url = Redacted.make(container.getConnectionUri())
        const TextClient = MysqlClient.layer({ url, disablePreparedStatements: true })
        const PreparedClient = MysqlClient.layer({ url })

        // read through the text client so the counter read itself never prepares
        const globalPrepareCount = Effect.gen(function*() {
          const sql = yield* MysqlClient.MysqlClient
          const rows = yield* sql.unsafe<{ Value: string }>(
            "SHOW GLOBAL STATUS LIKE 'Com_stmt_prepare'"
          )
          return Number(rows[0].Value)
        }).pipe(Effect.provide(TextClient))

        const workload = Effect.gen(function*() {
          const sql = yield* MysqlClient.MysqlClient

          yield* sql`DROP TABLE IF EXISTS text_protocol_test`
          yield* sql`CREATE TABLE text_protocol_test (id INT PRIMARY KEY AUTO_INCREMENT, value VARCHAR(255))`
          yield* sql`INSERT INTO text_protocol_test ${sql.insert([{ value: "a" }, { value: "b" }])}`

          const rows = yield* sql<{ value: string }>`SELECT value FROM text_protocol_test WHERE value = ${"a"}`
          assert.deepStrictEqual(rows, [{ value: "a" }])

          const values = yield* sql`SELECT value FROM text_protocol_test WHERE value = ${"b"}`.values
          assert.deepStrictEqual(values, [["b"]])

          const streamed = yield* Stream.runCollect(
            sql<{ value: string }>`SELECT value FROM text_protocol_test ORDER BY id`.stream
          )
          assert.deepStrictEqual(streamed, [{ value: "a" }, { value: "b" }])

          yield* sql.unsafe("SELECT value FROM text_protocol_test WHERE value = ?", ["a"]).raw

          yield* sql`DROP TABLE text_protocol_test`
        }).pipe(Effect.provide(TextClient))

        const before = yield* globalPrepareCount
        yield* workload
        const after = yield* globalPrepareCount
        assert.strictEqual(after - before, 0, `text-protocol workload prepared ${after - before} statement(s)`)

        const controlBefore = yield* globalPrepareCount
        yield* Effect.gen(function*() {
          const sql = yield* MysqlClient.MysqlClient
          yield* sql`SELECT ${"control"} AS value`
        }).pipe(Effect.provide(PreparedClient))
        const controlAfter = yield* globalPrepareCount
        assert.isAtLeast(controlAfter - controlBefore, 1)
      }).pipe(
        Effect.provide(MysqlContainer.layer),
        Effect.catchTag("ContainerError", () => Effect.void)
      ),
    { timeout: 60_000 }
  )
})
