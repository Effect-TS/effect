import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"
import { createTodosCrr, ensureCrSqlLoaded } from "./_helpers"

const DbMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

layer(DbMem)((it) => {
  it.scoped("core: sha/site_id/db_version/next_db_version/rows_impacted", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const sql = yield* SqlClient.SqlClient

      // sha via service
      const sha = yield* crsql.getSha
      assert.ok(typeof sha === "string" && sha.length > 0)
      assert.match(sha, /^[0-9a-f]+$/i)

      // site id via service
      const siteId = yield* crsql.getSiteIdHex
      assert.strictEqual(siteId.length, 32)
      assert.match(siteId, /^[0-9A-F]{32}$/i)

      // db version and next via service
      const v0 = yield* crsql.getDbVersion
      assert.strictEqual(v0, "0")
      const vnext0 = yield* crsql.getNextDbVersion
      assert.strictEqual(BigInt(vnext0), BigInt(v0) + 1n)

      // Create a CRR and insert one row to bump version and rows_impacted
      yield* createTodosCrr
      const pk = "C0C1C2C3C4C5C6C7C8C9CACBCCCDCECF"
      yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex(${pk}), 'Hello', 0)`

      // rows_impacted reflects the last write; read via service
      const impacted = yield* crsql.getRowsImpacted
      assert.ok(Number.isInteger(impacted) && impacted >= 0)

      const v1 = yield* crsql.getDbVersion
      assert.strictEqual(BigInt(v1), 1n)
      const vnext1 = yield* crsql.getNextDbVersion
      assert.strictEqual(BigInt(vnext1), BigInt(v1) + 1n)
    }))

  it.scoped("crsql_changes virtual table accessible", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const sql = yield* SqlClient.SqlClient
      // Just touch the table to ensure it exists and is queryable
      const rows = yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM crsql_changes`
      assert.ok(rows[0]?.n >= 0)
    }))

  it.scoped("as_crr => tracked; as_table => tracking stops", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const sql = yield* SqlClient.SqlClient

      // Fresh table name to avoid clashes across tests
      yield* sql`CREATE TABLE IF NOT EXISTS xtodos (
        id BLOB NOT NULL PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        completed INTEGER NOT NULL DEFAULT 0
      )`
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      yield* crsql.asCrr("xtodos")

      const pk1 = "00112233445566778899AABBCCDDEEFF"
      yield* sql`INSERT INTO xtodos (id, content, completed) VALUES (unhex(${pk1}), 'A', 0)`

      // Verify changes captured
      const crsql1 = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const v1 = yield* crsql1.getDbVersion
      const all = yield* crsql1.pullChanges("0")
      assert.ok(all.some((c) => c.pk.toUpperCase().endsWith(pk1)))

      // Downgrade and insert another row
      yield* crsql.asTable("xtodos")
      const pk2 = "FFEEDDCCBBAA99887766554433221100"
      yield* sql`INSERT INTO xtodos (id, content, completed) VALUES (unhex(${pk2}), 'B', 1)`

      // No new changes after v1
      const delta = yield* crsql.pullChanges(v1)
      assert.strictEqual(delta.length, 0)
    }))

  it.scoped("begin_alter/commit_alter: add column and capture thereafter", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const sql = yield* SqlClient.SqlClient

      // Fresh table
      yield* sql`DROP TABLE IF EXISTS utodos`
      yield* sql`CREATE TABLE utodos (
        id BLOB NOT NULL PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        completed INTEGER NOT NULL DEFAULT 0
      )`
      yield* sql`SELECT crsql_as_crr('utodos')`

      // Insert once and snapshot version
      const pk1 = "AA11223344556677889900AABBCCDDEE"
      yield* sql`INSERT INTO utodos (id, content, completed) VALUES (unhex(${pk1}), 'One', 0)`

      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const v1 = yield* crsql.getDbVersion

      // Alter schema under begin/commit
      const crsql2 = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      yield* crsql2.beginAlter("utodos")
      yield* sql`ALTER TABLE utodos ADD COLUMN note TEXT NOT NULL DEFAULT ''`
      yield* crsql2.commitAlter("utodos")

      // Insert again, this time with new column set
      const pk2 = "BB11223344556677889900AABBCCDDEE"
      yield* sql`INSERT INTO utodos (id, content, completed, note) VALUES (unhex(${pk2}), 'Two', 1, 'n')`

      // Expect new changes only for pk2 and include the new column
      const delta = yield* crsql.pullChanges(v1)
      assert.ok(delta.some((c) => c.pk.toUpperCase().endsWith(pk2)))
      assert.ok(delta.some((c) => c.cid === "note"))
      assert.ok(!delta.some((c) => c.pk.toUpperCase().endsWith(pk1)))
    }))
})
