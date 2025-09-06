import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"

const DbMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

layer(DbMem)((it) => {
  it.scoped("fractAsOrdered creates fractindex view", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      // Minimal table with an order column
      yield* sql`CREATE TABLE fi_items (id TEXT PRIMARY KEY, ord TEXT NOT NULL DEFAULT '')`
      yield* crsql.fractAsOrdered("fi_items", "ord")
      // The extension creates a helper view named {table}_fractindex
      const [exists] = yield* sql<{ n: number }>`
        SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'fi_items_fractindex'
      `
      assert.strictEqual(exists.n, 1)
    }))

  it.scoped("fractAsOrderedWith (grouped) creates fractindex view", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      // Grouped list by list_id
      yield* sql`CREATE TABLE fi_items2 (id TEXT PRIMARY KEY, list_id TEXT NOT NULL, ord TEXT NOT NULL DEFAULT '')`
      yield* crsql.fractAsOrderedWith("fi_items2", "ord", ["list_id"])
      const [exists] = yield* sql<{ n: number }>`
        SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'fi_items2_fractindex'
      `
      assert.strictEqual(exists.n, 1)
    }))

  it.scoped("append and prepend maintain stable ordering", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      // Fresh table
      yield* sql`DROP TABLE IF EXISTS fi_order1`
      yield* sql`CREATE TABLE fi_order1 (id TEXT PRIMARY KEY, ord TEXT NOT NULL DEFAULT '')`
      yield* crsql.fractAsOrdered("fi_order1", "ord")

      // Append then prepend
      yield* sql`INSERT INTO fi_order1 (id, ord) VALUES ('C', 1)`
      yield* sql`INSERT INTO fi_order1 (id, ord) VALUES ('A', -1)`

      const rows1 = yield* sql<{ id: string; ord: string }>`SELECT id, ord FROM fi_order1 ORDER BY ord`
      assert.deepEqual(rows1.map((r) => r.id), ["A", "C"]) // prepend placed A before C
      assert.ok(rows1.every((r) => typeof r.ord === "string" && r.ord.length > 0))

      // Append another
      yield* sql`INSERT INTO fi_order1 (id, ord) VALUES ('E', 1)`
      const rows2 = yield* sql<{ id: string; ord: string }>`SELECT id, ord FROM fi_order1 ORDER BY ord`
      assert.deepEqual(rows2.map((r) => r.id), ["A", "C", "E"]) // append placed E at end
    }))

  it.scoped("insert between neighbors using fractKeyBetween", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      // Fresh table
      yield* sql`DROP TABLE IF EXISTS fi_order2`
      yield* sql`CREATE TABLE fi_order2 (id TEXT PRIMARY KEY, ord TEXT NOT NULL DEFAULT '')`
      yield* crsql.fractAsOrdered("fi_order2", "ord")

      // Seed two items: A (prepend), C (append)
      yield* sql`INSERT INTO fi_order2 (id, ord) VALUES ('C', 1)`
      yield* sql`INSERT INTO fi_order2 (id, ord) VALUES ('A', -1)`
      const base = yield* sql<{ id: string; ord: string }>`SELECT id, ord FROM fi_order2 ORDER BY ord`
      const ordA = base.find((r) => r.id === "A")!.ord
      const ordC = base.find((r) => r.id === "C")!.ord

      // Generate a between key and insert B
      const between = yield* crsql.fractKeyBetween(ordA, ordC)
      yield* sql`INSERT INTO fi_order2 (id, ord) VALUES ('B', ${between})`

      const after = yield* sql<{ id: string; ord: string }>`SELECT id, ord FROM fi_order2 ORDER BY ord`
      assert.deepEqual(after.map((r) => r.id), ["A", "B", "C"]) // B is between A and C
    }))

  it.todo("fractKeyBetween: generate key between two existing ordered keys")
})
