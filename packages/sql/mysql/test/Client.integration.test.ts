import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { SqlClient } from "effect/unstable/sql"
import { MysqlContainer } from "./utils.ts"

describe("MysqlClient", () => {
  it.layer(MysqlContainer.layer, { timeout: "120 seconds", excludeTestServices: true })(
    "against a real server",
    (it) => {
      it.effect("runs a tagged statement", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          assert.deepStrictEqual(yield* sql`SELECT 1 AS n`, [{ n: 1n }])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("binds parameters", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          const name = "O'Brien"
          assert.deepStrictEqual(yield* sql`SELECT ${name} AS name`, [{ name: "O'Brien" }])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("quotes identifiers with backticks", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE ${sql("select")} (${sql("order")} INT)`
          yield* sql`INSERT INTO ${sql("select")} (${sql("order")}) VALUES (1)`
          assert.deepStrictEqual(yield* sql`SELECT * FROM ${sql("select")}`, [{ order: 1 }])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("inserts records and reads them back", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE people (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(64), age INT)`
          yield* sql`INSERT INTO people ${sql.insert([{ name: "alice", age: 30 }, { name: "bob", age: 40 }])}`
          const rows = yield* sql`SELECT name, age FROM people ORDER BY id`
          assert.deepStrictEqual(rows, [{ name: "alice", age: 30 }, { name: "bob", age: 40 }])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("expands sql.in", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE nums (n INT)`
          yield* sql`INSERT INTO nums ${sql.insert([{ n: 1 }, { n: 2 }, { n: 3 }])}`
          const rows = yield* sql`SELECT n FROM nums WHERE ${sql.in("n", [1, 3])} ORDER BY n`
          assert.deepStrictEqual(rows, [{ n: 1 }, { n: 3 }])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("commits a transaction", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE tx_commit (n INT)`
          yield* sql.withTransaction(sql`INSERT INTO tx_commit (n) VALUES (1)`)
          assert.deepStrictEqual(yield* sql`SELECT n FROM tx_commit`, [{ n: 1 }])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("rolls a transaction back on failure", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE tx_rollback (n INT)`
          const failed = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
            yield* sql`INSERT INTO tx_rollback (n) VALUES (1)`
            return yield* Effect.fail(new Error("nope"))
          })))
          assert.strictEqual(failed.message, "nope")
          assert.deepStrictEqual(yield* sql`SELECT n FROM tx_rollback`, [])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("rolls a nested transaction back to its savepoint", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE tx_savepoint (n INT)`
          yield* sql.withTransaction(Effect.gen(function*() {
            yield* sql`INSERT INTO tx_savepoint (n) VALUES (1)`
            yield* Effect.ignore(sql.withTransaction(Effect.gen(function*() {
              yield* sql`INSERT INTO tx_savepoint (n) VALUES (2)`
              return yield* Effect.fail(new Error("inner"))
            })))
          }))
          // The outer insert survives; only the savepoint is undone.
          assert.deepStrictEqual(yield* sql`SELECT n FROM tx_savepoint`, [{ n: 1 }])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("returns the insert id through raw results", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE raw_ids (id INT AUTO_INCREMENT PRIMARY KEY, n INT)`
          const raw: any = yield* sql`INSERT INTO raw_ids (n) VALUES (7)`.raw
          assert.strictEqual(raw.affectedRows, 1)
          assert.strictEqual(raw.lastInsertId, 1)
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("returns rows as arrays", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          assert.deepStrictEqual(yield* sql`SELECT 1 AS a, 'b' AS b`.values, [[1n, "b"]])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("applies name transforms in both directions", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE transformed (user_id INT, full_name VARCHAR(64))`
          yield* sql`INSERT INTO transformed ${sql.insert({ userId: 1, fullName: "alice" })}`
          assert.deepStrictEqual(yield* sql`SELECT * FROM transformed`, [{ userId: 1, fullName: "alice" }])
        }).pipe(Effect.provide(MysqlContainer.clientWithTransforms)), { timeout: 60_000 })

      it.effect("stores and reads JSON", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE docs (body JSON)`
          yield* sql`INSERT INTO docs (body) VALUES (${sql.unsafe(`'{"a":1}'`)})`
          assert.deepStrictEqual(yield* sql`SELECT body FROM docs`, [{ body: { a: 1 } }])
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("takes the mysql branch of onDialectOrElse", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          const dialect = sql.onDialectOrElse({ mysql: () => "mysql", orElse: () => "other" })
          assert.strictEqual(dialect, "mysql")
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })
    }
  )
})
