import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"
import * as os from "node:os"
import * as path from "node:path"
import { ensureCrSqlLoaded } from "./_helpers.js"

const DbMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

layer(DbMem)((it) => {
  it.scoped("automigrate: initial apply creates CRR and tracks changes", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const sql = yield* SqlClient.SqlClient

      yield* crsql.automigrate`
        CREATE TABLE IF NOT EXISTS items (
          id BLOB NOT NULL PRIMARY KEY,
          name TEXT NOT NULL DEFAULT '',
          qty INTEGER NOT NULL DEFAULT 0
        );
        SELECT crsql_as_crr('items');
      `

      // Insert a row; verify changes visible
      const pk = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      yield* sql`INSERT INTO items (id, name, qty) VALUES (unhex(${pk}), 'Widget', 2)`

      const changes = yield* crsql.pullChanges("0")
      assert.ok(changes.some((c) => c.table === "items" && c.pk.toUpperCase().endsWith(pk)))
      assert.ok(changes.some((c) => c.cid === "name" && c.val === "Widget"))
      assert.ok(changes.some((c) => c.cid === "qty" && c.val === 2))
    }))

  it.scoped("automigrate: add column and capture new column changes", () =>
    Effect.gen(function*() {
      const uri = path.join(os.tmpdir(), `am-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`)
      // Stage 1 on connection A
      const stage1 = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        const sql = yield* SqlClient.SqlClient

        // Initial schema (no note column)
        yield* crsql.automigrate`
          CREATE TABLE IF NOT EXISTS items2 (
            id BLOB NOT NULL PRIMARY KEY,
            name TEXT NOT NULL DEFAULT '',
            qty INTEGER NOT NULL DEFAULT 0
          );
          SELECT crsql_as_crr('items2');
        `

        const pk1 = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
        yield* sql`INSERT INTO items2 (id, name, qty) VALUES (unhex(${pk1}), 'Alpha', 1)`
        const v1 = yield* crsql.getDbVersion

        // New schema with added column
        yield* crsql.automigrate`
          CREATE TABLE IF NOT EXISTS items2 (
            id BLOB NOT NULL PRIMARY KEY,
            name TEXT NOT NULL DEFAULT '',
            qty INTEGER NOT NULL DEFAULT 0,
            note TEXT NOT NULL DEFAULT ''
          );
          SELECT crsql_as_crr('items2');
        `
        return { v1, pk1 }
      }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: uri })))

      // Stage 2 on connection B (fresh handle to the same shared-memory DB)
      const delta = yield* Effect.gen(function*() {
        const crsql2 = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        const sql2 = yield* SqlClient.SqlClient
        const pk2 = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
        yield* sql2`INSERT INTO items2 (id, name, qty, note) VALUES (unhex(${pk2}), 'Beta', 2, 'n')`
        const out = yield* crsql2.pullChanges(stage1.v1)
        return { out, pk2 }
      }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: uri })))
      // Extract pk2 and changes
      const { out: changes2, pk2 } = delta
      const forPk2 = changes2.filter((c) => c.pk.toUpperCase().endsWith(pk2))
      assert.ok(forPk2.length > 0)
      assert.ok(forPk2.some((c) => c.cid === "note" && c.val === "n"))
      // Ensure we did not include the earlier row (pk1) in the delta
      assert.ok(!changes2.some((c) => c.pk.toUpperCase().endsWith(stage1.pk1)))
    }))

  it.scoped("automigrate call is parameterized; injection cannot break out", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const sql = yield* SqlClient.SqlClient

      // Create a victim table to assert that it cannot be dropped via injection
      yield* sql`CREATE TABLE victim (name TEXT NOT NULL)`
      yield* sql`INSERT INTO victim (name) VALUES ('ok')`

      // If the crsql.automigrate call were built via string concatenation, the following
      // payload would terminate the function call and execute a DROP TABLE. Because the call
      // is parameterized via Effect SQL templates, this remains an argument to the function
      // and does not execute as separate SQL.
      const payload = "'); DROP TABLE victim; --"

      const result = yield* crsql.automigrate(payload).pipe(Effect.either)
      assert.isTrue(result._tag === "Left") // invalid migration payload causes a failure

      const [exists] = yield* sql<{ n: number }>`
        SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'victim'
      `
      assert.strictEqual(exists.n, 1)
      const [row] = yield* sql<{ name: string }>`SELECT name FROM victim LIMIT 1`
      assert.strictEqual(row.name, "ok")
    }))
})
