import { NodeCrypto, NodeSocketConnector } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Stream } from "effect"
import { MysqlClient, MysqlConnection, MysqlMigrator } from "effect/mysql"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SqlClient from "effect/sql/SqlClient"

// Supply a disposable database with MYSQL_TEST_URL. Full caching SHA-2
// authentication uses MYSQL_TEST_PUBLIC_KEY or explicit key retrieval.
// MYSQL_TEST_TLS=1 enables verified TLS.
const url = process.env.MYSQL_TEST_URL
const transport = Layer.mergeAll(NodeCrypto.layer, NodeSocketConnector.layer, Reactivity.layer)
const options: MysqlClient.MysqlClientConfig = {
  url: Redacted.make(url ?? "mysql://localhost/test"),
  ssl: process.env.MYSQL_TEST_TLS === "1",
  maxConnections: 1,
  serverPublicKey: process.env.MYSQL_TEST_PUBLIC_KEY,
  allowPublicKeyRetrieval: process.env.MYSQL_TEST_ALLOW_PUBLIC_KEY_RETRIEVAL === "1"
}

describe.skipIf(url === undefined)("native MySQL server integration", () => {
  it.effect("round trips prepared values with independent server decoding", () =>
    Effect.gen(function*() {
      const connection = yield* MysqlConnection.make(options)
      const bytes = Uint8Array.of(0, 1, 255)
      const text = "雪💚'\\\0"
      const date = new Date(2025, 3, 2, 9, 8, 7, 123)
      const result = yield* connection.query(
        "SELECT CAST(? AS SIGNED) AS i, CAST(? AS DOUBLE) AS f, CAST(? AS UNSIGNED) AS big, ? AS text, CAST(? AS BINARY) AS bytes, CAST(? AS DATETIME(3)) AS instant, CAST(? AS JSON) AS json, ? AS nil",
        [42, 1.5, BigInt("18446744073709551615"), text, bytes, date, { hello: "world" }, null]
      )
      assert.deepStrictEqual(result.rows, [{
        i: 42,
        f: 1.5,
        big: "18446744073709551615",
        text,
        bytes,
        instant: date,
        json: { hello: "world" },
        nil: null
      }])
      assert.strictEqual(connection.isClosed(), false)
    }).pipe(Effect.provide(transport)))

  it.effect("round trips actual BLOB and unsigned BIGINT columns with prepared and text commands", () =>
    Effect.gen(function*() {
      const connection = yield* MysqlConnection.make(options)
      const bytes = Uint8Array.of(0, 1, 255, 128)
      const integer = BigInt("18446744073709551615")
      yield* connection.query(
        "CREATE TEMPORARY TABLE native_mysql_values_test (n BIGINT UNSIGNED, payload LONGBLOB, text_value TEXT, json_value JSON)"
      )
      const inserted = yield* connection.query("INSERT INTO native_mysql_values_test VALUES (?, ?, ?, ?)", [
        integer,
        bytes,
        "雪💚",
        { hello: "world" }
      ])
      assert.strictEqual(inserted.affectedRows, 1)
      for (const prepared of [true, false]) {
        const result = yield* connection.query(
          "SELECT n, payload, text_value, json_value FROM native_mysql_values_test",
          [],
          prepared
        )
        assert.deepStrictEqual(result.rows, [{
          n: String(integer),
          payload: bytes,
          text_value: "雪💚",
          json_value: { hello: "world" }
        }])
        assert.deepStrictEqual(result.values, [[String(integer), bytes, "雪💚", { hello: "world" }]])
      }
    }).pipe(Effect.provide(transport)))

  it.effect("keeps text parameters safe across SQL escaping modes", () =>
    Effect.gen(function*() {
      const connection = yield* MysqlConnection.make(options)
      yield* connection.query("SET SESSION sql_mode = 'NO_BACKSLASH_ESCAPES'", [], false)
      const input = "雪💚'\\\0; DROP TABLE ignored; --"
      const result = yield* connection.query("SELECT ? AS text, '?' AS literal", [input], false)
      assert.deepStrictEqual(result.rows, [{ text: input, literal: "?" }])
      const rows = yield* Stream.runCollect(connection.stream("SELECT 1 AS n UNION ALL SELECT 2 AS n", [], false))
      assert.deepStrictEqual(rows, [{ n: 1 }, { n: 2 }])
    }).pipe(Effect.provide(transport)))

  it.effect("rolls back failed nested transactions without abandoning the outer transaction", () =>
    Effect.gen(function*() {
      const sql = yield* MysqlClient.make(options)
      yield* sql.withTransaction(Effect.gen(function*() {
        yield* sql`CREATE TEMPORARY TABLE native_mysql_transaction_test (id INT PRIMARY KEY)`
        yield* sql`INSERT INTO native_mysql_transaction_test VALUES (${1})`
        const error = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
          yield* sql`INSERT INTO native_mysql_transaction_test VALUES (${2})`
          yield* sql`INSERT INTO native_mysql_transaction_test VALUES (${1})`
        })))
        assert.strictEqual(error.reason._tag, "UniqueViolation")
        const rows = yield* sql<{ id: number }>`SELECT id FROM native_mysql_transaction_test ORDER BY id`
        assert.deepStrictEqual(rows, [{ id: 1 }])
        yield* sql`DROP TEMPORARY TABLE native_mysql_transaction_test`
      }))
      assert.deepStrictEqual(yield* sql`SELECT 42 AS n`, [{ n: 42 }])
    }).pipe(Effect.provide(transport)))

  it.effect("replaces a pooled session after stopping a prepared stream early", () =>
    Effect.gen(function*() {
      const sql = yield* MysqlClient.make(options)
      const query = sql<{ n: number }>`
        WITH RECURSIVE numbers AS (
          SELECT 1 AS n UNION ALL SELECT n + 1 FROM numbers WHERE n < 100
        ) SELECT n FROM numbers ORDER BY n
      `
      assert.deepStrictEqual(yield* Stream.runCollect(query.stream.pipe(Stream.take(1))), [{ n: 1 }])
      assert.deepStrictEqual(yield* sql`SELECT 42 AS answer`, [{ answer: 42 }])
      assert.strictEqual((yield* Stream.runCollect(query.stream)).length, 100)
    }).pipe(Effect.provide(transport)))

  it.effect("applies native migrations once and preserves their history", () =>
    Effect.gen(function*() {
      const sql = yield* MysqlClient.make(options)
      const suffix = globalThis.crypto.randomUUID().replaceAll("-", "")
      const table = `native_mysql_data_${suffix}`
      const history = `native_mysql_migrations_${suffix}`
      yield* Effect.addFinalizer(() =>
        Effect.forEach([table, history], (name) => sql`DROP TABLE IF EXISTS ${sql(name)}`, {
          discard: true
        }).pipe(Effect.ignore)
      )
      const loader = MysqlMigrator.fromRecord({
        "0001_create_table": sql`CREATE TABLE ${sql(table)} (id INT PRIMARY KEY)`.pipe(Effect.asVoid),
        "0002_insert_row": sql`INSERT INTO ${sql(table)} VALUES (${42})`.pipe(Effect.asVoid)
      })
      const migrate = MysqlMigrator.run({ table: history, loader }).pipe(
        Effect.provideService(SqlClient.SqlClient, sql)
      )
      assert.deepStrictEqual(yield* migrate, [[1, "create_table"], [2, "insert_row"]])
      assert.deepStrictEqual(yield* migrate, [])
      assert.deepStrictEqual(yield* sql`SELECT id FROM ${sql(table)}`, [{ id: 42 }])
    }).pipe(Effect.provide(transport)))
})
