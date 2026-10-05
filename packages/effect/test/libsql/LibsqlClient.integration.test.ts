import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Stream } from "effect"
import { FetchHttpClient } from "effect/http"
import { LibsqlClient, LibsqlMigrator } from "effect/libsql"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SqlClient from "effect/sql/SqlClient"

// EFFECT_INTEGRATION_TESTS=1 LIBSQL_TEST_URL=http://127.0.0.1:8080 pnpm test --run packages/effect/test/libsql/LibsqlClient.integration.test.ts
// Use a disposable database with CREATE / INSERT / DROP privileges.
const url = process.env.LIBSQL_TEST_URL
const transport = Layer.mergeAll(FetchHttpClient.layer, Reactivity.layer)
const options: LibsqlClient.LibsqlClientConfig = {
  url: url ?? "http://127.0.0.1:8080",
  authToken: process.env.LIBSQL_TEST_AUTH_TOKEN === undefined
    ? undefined
    : Redacted.make(process.env.LIBSQL_TEST_AUTH_TOKEN)
}
const tableName = () => `native_effect_${globalThis.crypto.randomUUID().replaceAll("-", "")}`

describe.skipIf(url === undefined)("native libSQL live Hrana HTTP integration", () => {
  it.effect("round trips independent server values over Hrana v2 and v3", () =>
    Effect.gen(function*() {
      for (const protocolVersion of [2, 3] as const) {
        const sql = yield* LibsqlClient.make({ ...options, protocolVersion })
        const text = "雪💚'; DROP TABLE ignored;--\\\0"
        const bytes = Uint8Array.of(99, 0, 1, 255, 99).subarray(1, 4)
        const instant = new Date("2025-04-02T09:08:07.123Z")
        assert.deepStrictEqual(
          yield* sql`SELECT ${text} AS text, ${bytes} AS bytes, ${42} AS n, ${1.5} AS float_value, ${true} AS bit_value, ${null} AS nil, ${instant} AS instant`,
          [{ text, bytes, n: 42, float_value: 1.5, bit_value: 1, nil: null, instant: instant.getTime() }]
        )
        assert.deepStrictEqual(yield* sql`SELECT ${42} AS n, ${"hello"} AS text`.values, [[42, "hello"]])
        const raw = yield* sql`SELECT ${42} AS answer`.raw as Effect.Effect<LibsqlClient.ResultSet, never>
        assert.deepStrictEqual(raw.columns, ["answer"])
        assert.deepStrictEqual(raw.rows, [{ answer: 42 }])
        assert.deepStrictEqual(raw.values, [[42]])
      }
      for (const intMode of ["bigint", "string"] as const) {
        const sql = yield* LibsqlClient.make({ ...options, intMode })
        const big = BigInt("9223372036854775807")
        assert.deepStrictEqual(yield* sql`SELECT ${big} AS n`, [{ n: intMode === "bigint" ? big : big.toString() }])
      }
    }).pipe(Effect.provide(transport)), { timeout: 30000 })

  it.effect(
    "preserves transaction batons across nested savepoints, rollback, commit, and constraint failures",
    () =>
      Effect.gen(function*() {
        const sql = yield* LibsqlClient.make(options)
        const table = tableName()
        yield* sql`CREATE TABLE ${sql(table)} (id INTEGER PRIMARY KEY, value TEXT UNIQUE)`
        yield* Effect.addFinalizer(() => sql`DROP TABLE IF EXISTS ${sql(table)}`.pipe(Effect.ignore))
        const rolledBack = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
          yield* sql`INSERT INTO ${sql(table)} VALUES (${1}, ${"one"})`
          const nested = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
            yield* sql`INSERT INTO ${sql(table)} VALUES (${2}, ${"two"})`
            return yield* Effect.fail("rollback nested")
          })))
          assert.strictEqual(nested, "rollback nested")
          assert.deepStrictEqual(yield* sql`SELECT id FROM ${sql(table)}`, [{ id: 1 }])
          return yield* Effect.fail("rollback outer")
        })))
        assert.strictEqual(rolledBack, "rollback outer")
        assert.deepStrictEqual(yield* sql`SELECT id FROM ${sql(table)}`, [])
        yield* sql.withTransaction(sql`INSERT INTO ${sql(table)} VALUES (${3}, ${"three"})`)
        const duplicate = yield* Effect.flip(sql`INSERT INTO ${sql(table)} VALUES (${4}, ${"three"})`)
        // sqld exposes the generic SQLITE_CONSTRAINT code over Hrana.
        assert.strictEqual(duplicate.reason._tag, "ConstraintError")
        assert.include(duplicate.reason.message!, "UNIQUE constraint failed")
        assert.deepStrictEqual(yield* sql`SELECT id, value FROM ${sql(table)}`, [{ id: 3, value: "three" }])
      }).pipe(Effect.provide(transport)),
    { timeout: 30000 }
  )

  it.effect(
    "streams buffered server rows and applies shared transactional migrations exactly once",
    () =>
      Effect.gen(function*() {
        const sql = yield* LibsqlClient.make(options)
        const rows = yield* Stream.runCollect(
          sql`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 1000) SELECT x FROM n`.stream
        )
        assert.strictEqual(rows.length, 1000)
        assert.deepStrictEqual(rows[0], { x: 1 })
        assert.deepStrictEqual(rows.at(-1), { x: 1000 })
        const data = tableName()
        const history = tableName()
        yield* Effect.addFinalizer(() =>
          Effect.forEach([data, history], (table) => sql`DROP TABLE IF EXISTS ${sql(table)}`.pipe(Effect.ignore), {
            discard: true
          })
        )
        const loader = LibsqlMigrator.fromRecord({
          "0001_create_table": sql`CREATE TABLE ${sql(data)} (id INTEGER PRIMARY KEY)`.pipe(Effect.asVoid),
          "0002_insert_row": sql`INSERT INTO ${sql(data)} VALUES (${42})`.pipe(Effect.asVoid)
        })
        const migrate = LibsqlMigrator.run({ table: history, loader }).pipe(
          Effect.provideService(SqlClient.SqlClient, sql)
        )
        assert.deepStrictEqual(yield* migrate, [[1, "create_table"], [2, "insert_row"]])
        assert.deepStrictEqual(yield* migrate, [])
        assert.deepStrictEqual(yield* sql`SELECT id FROM ${sql(data)}`, [{ id: 42 }])
        assert.strictEqual((yield* Effect.flip(sql.unsafe("SELEC invalid syntax"))).reason._tag, "SqlSyntaxError")
      }).pipe(Effect.provide(transport)),
    { timeout: 30000 }
  )
})
