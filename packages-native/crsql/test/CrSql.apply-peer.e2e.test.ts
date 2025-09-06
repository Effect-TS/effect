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
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.pullChanges("0")
      }).pipe(Effect.provide(Db1))
      assert.ok(exported.length > 0)

      // DB2: create CRR, apply, and verify (same connection)
      yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        yield* crsql.applyChanges(exported)

        const sql = yield* SqlClient.SqlClient
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
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        const site2 = yield* crsql.getSiteIdHex
        const v2 = yield* crsql.getDbVersion
        return { site2, v2 }
      }).pipe(Effect.provide(Db2))

      // Keep DB1 work on a single connection/layer provision
      const tracked = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        yield* crsql.setPeerVersion({ siteId: info2.site2, version: info2.v2, seq: 0 })
        // Inspect stored peers to validate hex site id and version
        const sql = yield* SqlClient.SqlClient
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
})
