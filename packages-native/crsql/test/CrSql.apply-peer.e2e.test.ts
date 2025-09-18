import { CrSql } from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as Console from "effect/Console"
import { createTodosCrr, ensureCrSqlLoaded } from "./_helpers.js"

layer(Layer.mergeAll(Reactivity.layer, Layer.scope))((it) => {
  it.scoped("applyChanges: exports from DB1 apply into DB2", () =>
    Effect.gen(function*() {
      // Single provided connections per DB to keep :memory: state
      const Db1 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

      const pkA = "00112233445566778899AABBCCDDEEFF"
      const pkB = "FFEEDDCCBBAA99887766554433221100"

      // DB1: create CRR, insert, then export (same connection)
      const exported = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex(${pkA}), 'Alpha', 0)`
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex(${pkB}), 'Beta', 1)`
        const crsql = yield* CrSql.fromSqliteClient()
        return yield* crsql.pullChanges("0")
      }).pipe(Effect.provide(Db1))
      assert.ok(exported.length > 0)

      // DB2: create CRR, apply, and verify (same connection)
      yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const sql = yield* SqlClient.SqlClient
        const crsql = yield* CrSql.fromSqliteClient()
        yield* crsql.applyChanges(exported)

        const rowsA = yield* sql<{ content: string; completed: number }>`
          SELECT content, completed FROM todos WHERE id = unhex(${pkA})
        `
        const rowsB = yield* sql<{ content: string; completed: number }>`
          SELECT content, completed FROM todos WHERE id = unhex(${pkB})
        `
        assert.strictEqual(rowsA.length, 1)
        assert.strictEqual(rowsA[0].content, "Alpha")
        assert.strictEqual(rowsA[0].completed, 0)
        assert.strictEqual(rowsB.length, 1)
        assert.strictEqual(rowsB[0].content, "Beta")
        assert.strictEqual(rowsB[0].completed, 1)
      }).pipe(Effect.provide(Db2))
    }))

  it.scoped("tracked peers: set/get works across DBs", () =>
    Effect.gen(function*() {
      const Db1 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

      // Keep DB2 work on a single connection/layer provision
      const info2 = yield* Effect.gen(function*() {
        const pk = "00112233445566778899AABBCCDDEEFF"
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex(${pk}), 'Gamma', 0)`
        const crsql = yield* CrSql.fromSqliteClient()
        const site2 = yield* crsql.getSiteIdHex
        const v2 = yield* crsql.getDbVersion
        return { site2, v2 }
      }).pipe(Effect.provide(Db2))

      // Keep DB1 work on a single connection/layer provision
      const tracked = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const sql = yield* SqlClient.SqlClient
        const crsql = yield* CrSql.fromSqliteClient()
        yield* crsql.setPeerVersion({ siteId: info2.site2, version: info2.v2, seq: 0 })
        // Inspect stored peers to validate hex site id and version
        const rows = yield* sql<{ sid: string; v: string; seq: number }>`
          SELECT hex(site_id) AS sid, CAST(version AS TEXT) AS v, seq FROM crsql_tracked_peers
        `
        yield* Console.log("DB1 tracked_peers rows:", rows)
        yield* Console.log("Expect site2:", info2.site2, "v2:", info2.v2)
        // Expect at least one row matching site2 and v2
        const checks = rows.map((r) => ({
          sidEq: r.sid.toUpperCase() === info2.site2.toUpperCase(),
          v: r.v,
          v2: info2.v2,
          seq: r.seq
        }))
        yield* Console.log("peer checks:", checks)
        assert.ok(
          rows.some((r) => r.sid.toUpperCase() === info2.site2.toUpperCase() && r.v === info2.v2 && r.seq === 0)
        )
        // Also validate map keyed by site id
        const map = yield* crsql.trackedPeersMap
        assert.deepEqual(map[info2.site2], { version: info2.v2, seq: 0 })
        return yield* crsql.getPeerVersion(info2.site2)
      }).pipe(Effect.provide(Db1))

      assert.deepEqual(tracked, { version: info2.v2, seq: 0 })
    }))

  it.scoped("fromSqliteClient: explicit sql handles multiple instances", () =>
    Effect.gen(function*() {
      const db1 = yield* NodeSqlite.SqliteClient.make({ filename: ":memory:" })
      const db2 = yield* NodeSqlite.SqliteClient.make({ filename: ":memory:" })

      const crsql1 = yield* CrSql.fromSqliteClient({ sql: db1 })
      const crsql2 = yield* CrSql.fromSqliteClient({ sql: db2 })

      const pkA = "AA11BB22CC33DD44EE55FF6677889900"
      const pkB = "00998877665544332211FFEECCDDBBAA"

      const createTodos = (crsql: typeof crsql1) =>
        Effect.gen(function*() {
          yield* crsql.automigrate`
            CREATE TABLE IF NOT EXISTS todos (
              id BLOB NOT NULL PRIMARY KEY,
              content TEXT NOT NULL DEFAULT '',
              completed INTEGER NOT NULL DEFAULT 0
            )
          `
          yield* crsql.asCrr("todos")
        })

      yield* createTodos(crsql1)
      yield* createTodos(crsql2)

      yield* db1`INSERT INTO todos (id, content, completed) VALUES (unhex(${pkA}), 'Scope Alpha', 0)`
      yield* db1`INSERT INTO todos (id, content, completed) VALUES (unhex(${pkB}), 'Scope Beta', 1)`

      const exported = yield* crsql1.pullChanges("0")
      assert.ok(exported.length > 0)

      yield* crsql2.applyChanges(exported)

      const rowsA = yield* db2<{ content: string; completed: number }>`
        SELECT content, completed FROM todos WHERE id = unhex(${pkA})
      `
      const rowsB = yield* db2<{ content: string; completed: number }>`
        SELECT content, completed FROM todos WHERE id = unhex(${pkB})
      `

      assert.strictEqual(rowsA.length, 1)
      assert.strictEqual(rowsA[0].content, "Scope Alpha")
      assert.strictEqual(rowsA[0].completed, 0)
      assert.strictEqual(rowsB.length, 1)
      assert.strictEqual(rowsB[0].content, "Scope Beta")
      assert.strictEqual(rowsB[0].completed, 1)

      const site1 = yield* crsql1.getSiteIdHex
      const site2 = yield* crsql2.getSiteIdHex
      assert.notStrictEqual(site1.toUpperCase(), site2.toUpperCase())
    }))
})
