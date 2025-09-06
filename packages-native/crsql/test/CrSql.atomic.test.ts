import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"
import * as Layer from "effect/Layer"

const DbMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

const createTodosCrr = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql`CREATE TABLE IF NOT EXISTS todos (
    id BLOB NOT NULL PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0
  )`
  yield* sql`SELECT crsql_as_crr('todos')`
})

layer(DbMem)((it) => {
  it.scoped("Default service yields site id (inspired by scratchpad)", () =>
    Effect.gen(function*() {
      // Use the default service wired with Node Sqlite layer
      const layers = CrSql.CrSql.Default.pipe(
        Layer.provideMerge(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
      const siteId = yield* CrSql.CrSql.getSiteIdHex.pipe(Effect.provide(layers))
      assert.strictEqual(siteId.length, 32)
      assert.match(siteId, /^[0-9A-F]{32}$/i)
    }))

  it.scoped("crsql_sha missing before load; present after fromSqliteClient", () =>
    Effect.gen(function*() {
      const sql = yield* NodeSqlite.SqliteClient.SqliteClient

      // Before loading the extension, calling crsql_sha() should error.
      const before = yield* sql`SELECT crsql_sha() as sha`.pipe(Effect.exit)
      assert.isTrue(before._tag === "Failure")
      if (before._tag === "Failure") {
        assert.match(String(before.cause), /(no such function: crsql_sha|Failed to prepare statement)/i)
      }

      // Load via product API and verify we can read a site id
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
      const siteId = yield* crsql.getSiteIdHex
      assert.strictEqual(siteId.length, 32)
    }))
  it.scoped("crsql_as_crr + insert succeeds under loaded extension", () =>
    Effect.gen(function*() {
      // Ensure CR-SQLite is loaded via the product code (no duplication).
      // Calling the service loader initializes the extension on this connection.
      yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      yield* createTodosCrr
      const sql = yield* SqlClient.SqlClient
      const pk = "00112233445566778899AABBCCDDEEFF"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (unhex(${pk}), 'Alpha', 0)`
      const rows = yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM todos`
      assert.strictEqual(rows[0]?.n, 1)
    }))

  it.scoped("pullChanges returns inserted columns (content, completed)", () =>
    Effect.gen(function*() {
      yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      yield* createTodosCrr
      const sql = yield* SqlClient.SqlClient
      const pk = "11223344556677889900AABBCCDDEEFF"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (unhex(${pk}), 'Buy milk', 0)`

      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const changes = yield* crsql.pullChanges("0")
      assert.ok(changes.length > 0)
      // CR-SQLite encodes PKs in a packed blob; for single BLOB PKs the hex
      // ends with the actual PK value. Match by suffix to avoid coupling to
      // the pack format while still asserting row identity.
      const forPk = changes.filter((c) => c.pk.toUpperCase().endsWith(pk))
      assert.ok(forPk.some((c) => c.cid === "content" && c.val === "Buy milk"))
      assert.ok(forPk.some((c) => c.cid === "completed" && c.val === 0))
    }))

  it.scoped("db version increments; since-cursor filters earlier changes", () =>
    Effect.gen(function*() {
      // Ensure extension is loaded via product API
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      yield* createTodosCrr

      const sql = yield* SqlClient.SqlClient
      const pk1 = "AA11223344556677889900AABBCCDDEE"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (unhex(${pk1}), 'One', 0)`
      const v1 = yield* crsql.getDbVersion

      const pk2 = "BB11223344556677889900AABBCCDDEE"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (unhex(${pk2}), 'Two', 1)`

      const delta = yield* crsql.pullChanges(v1)
      const byPk2 = delta.filter((c) => c.pk.toUpperCase().endsWith(pk2))
      const byPk1 = delta.filter((c) => c.pk.toUpperCase().endsWith(pk1))
      assert.ok(byPk2.length > 0)
      assert.strictEqual(byPk1.length, 0)
    }))

  it.scoped("finalize does not fail", () =>
    Effect.gen(function*() {
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      // Should be safe and idempotent
      yield* crsql.finalize
    }))
})
