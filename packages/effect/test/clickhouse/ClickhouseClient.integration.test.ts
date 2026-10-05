import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Stream } from "effect"
import { ClickhouseClient, ClickhouseMigrator } from "effect/clickhouse"
import { FetchHttpClient } from "effect/http"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SqlClient from "effect/sql/SqlClient"

// EFFECT_INTEGRATION_TESTS=1 CLICKHOUSE_TEST_URL=http://127.0.0.1:8123 pnpm test --run packages/effect/test/clickhouse/ClickhouseClient.integration.test.ts
// Use a disposable database with CREATE / INSERT / DROP privileges.
const url = process.env.CLICKHOUSE_TEST_URL
const transport = Layer.mergeAll(FetchHttpClient.layer, Reactivity.layer)
const options: ClickhouseClient.ClickhouseClientConfig = {
  url: url ?? "http://127.0.0.1:8123",
  username: process.env.CLICKHOUSE_TEST_USERNAME ?? "default",
  password: Redacted.make(process.env.CLICKHOUSE_TEST_PASSWORD ?? ""),
  database: process.env.CLICKHOUSE_TEST_DATABASE ?? "default",
  requestTimeout: "20 seconds"
}
const tableName = () => `native_effect_${globalThis.crypto.randomUUID().replaceAll("-", "")}`

describe.skipIf(url === undefined)("native ClickHouse live HTTP integration", () => {
  it.effect("binds real server parameters and returns raw metadata and value arrays", () =>
    Effect.gen(function*() {
      const sql = yield* ClickhouseClient.make(options)
      const text = "雪💚'; DROP TABLE ignored;--\\\0\t\n\r\b\f"
      assert.deepStrictEqual(yield* sql`SELECT ${text} AS text, ${sql.param("UInt32", 42)} AS n, ${null} AS nil`, [{
        text,
        n: 42,
        nil: null
      }])
      assert.deepStrictEqual(yield* sql`SELECT ${sql.param("Array(UInt32)", [1, 2, 3])} AS values`.values, [[[
        1,
        2,
        3
      ]]])
      assert.deepStrictEqual(yield* sql`SELECT ${sql.param("Array(String)", [text, "'\\\n"])} AS values`, [{
        values: [text, "'\\\n"]
      }])
      const raw = yield* sql`SELECT toUInt32(42) AS answer`.raw as Effect.Effect<ClickhouseClient.QueryResult, never>
      assert.deepStrictEqual(raw.meta, [{ name: "answer", type: "UInt32" }])
      assert.deepStrictEqual(raw.data, [{ answer: 42 }])
      assert.strictEqual(raw.rows, 1)
      assert.isNotEmpty(raw.query_id)
    }).pipe(Effect.provide(transport)), { timeout: 30000 })

  it.effect(
    "inserts object rows and encoded HTTP streams, then streams independent server results",
    () =>
      Effect.gen(function*() {
        const sql = yield* ClickhouseClient.make(options)
        const table = tableName()
        yield* sql.asCommand(sql`CREATE TABLE ${sql(table)} (id UInt32, name String) ENGINE = Memory`)
        yield* Effect.addFinalizer(() => sql.asCommand(sql`DROP TABLE IF EXISTS ${sql(table)}`).pipe(Effect.ignore))
        yield* sql.insertQuery({ table, values: [{ id: 1, name: "雪" }, { id: 2, name: "💚" }] })
        yield* sql.insertQuery({
          table,
          values: Stream.make(new TextEncoder().encode("{\"id\":3,\"name\":\"stream\"}\n")),
          format: "JSONEachRow"
        })
        assert.deepStrictEqual(yield* sql`SELECT id, name FROM ${sql(table)} ORDER BY id`, [{ id: 1, name: "雪" }, {
          id: 2,
          name: "💚"
        }, { id: 3, name: "stream" }])
        const rows = yield* Stream.runCollect(sql`SELECT toUInt32(number) AS n FROM numbers(10000)`.stream)
        assert.strictEqual(rows.length, 10000)
        assert.deepStrictEqual(rows[0], { n: 0 })
        assert.deepStrictEqual(rows.at(-1), { n: 9999 })
        assert.deepStrictEqual(
          yield* Stream.runCollect(sql`SELECT toUInt32(number) AS n FROM numbers(1000000)`.stream.pipe(Stream.take(1))),
          [{ n: 0 }]
        )
        assert.deepStrictEqual(yield* sql`SELECT toUInt32(7) AS n`, [{ n: 7 }])
      }).pipe(Effect.provide(transport)),
    { timeout: 30000 }
  )

  it.effect(
    "classifies real SQL errors and records migrations once in MergeTree history",
    () =>
      Effect.gen(function*() {
        const sql = yield* ClickhouseClient.make(options)
        const error = yield* Effect.flip(sql.unsafe("SELEC invalid syntax"))
        assert.strictEqual(error.reason._tag, "SqlSyntaxError")
        const data = tableName()
        const history = tableName()
        yield* Effect.addFinalizer(() =>
          Effect.forEach(
            [data, history],
            (table) => sql.asCommand(sql`DROP TABLE IF EXISTS ${sql(table)}`).pipe(Effect.ignore),
            { discard: true }
          )
        )
        const loader = ClickhouseMigrator.fromRecord({
          "0001_create_table": sql.asCommand(sql`CREATE TABLE ${sql(data)} (id UInt32) ENGINE = Memory`).pipe(
            Effect.asVoid
          ),
          "0002_insert_row": sql.insertQuery({ table: data, values: [{ id: 42 }] }).pipe(Effect.asVoid)
        })
        const migrate = ClickhouseMigrator.run({ table: history, loader }).pipe(
          Effect.provideService(ClickhouseClient.ClickhouseClient, sql),
          Effect.provideService(SqlClient.SqlClient, sql)
        )
        assert.deepStrictEqual(yield* migrate, [[1, "create_table"], [2, "insert_row"]])
        assert.deepStrictEqual(yield* migrate, [])
        assert.deepStrictEqual(yield* sql`SELECT id FROM ${sql(data)}`, [{ id: 42 }])
        assert.deepStrictEqual(yield* sql`SELECT migration_id FROM ${sql(history)} ORDER BY migration_id`, [{
          migration_id: 1
        }, { migration_id: 2 }])
      }).pipe(Effect.provide(transport)),
    { timeout: 30000 }
  )
})
