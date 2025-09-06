import { CrSql } from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"
import * as Layer from "effect/Layer"

layer(Layer.mergeAll(Reactivity.layer, Layer.scope))((it) => {
  it.scoped("applyChanges decodes BLOB values: applies blob change rows (pk and val) losslessly", () =>
    Effect.gen(function*() {
      // Stage 1: Produce a change with BLOB PK and BLOB value
      const source = yield* Effect.gen(function*() {
        const layer = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

        return yield* Effect.gen(function*() {
          const sql = yield* NodeSqlite.SqliteClient.SqliteClient
          const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })

          // Schema and CRR enablement
          // NOTE: CRR requirement — all NOT NULL, non-PK columns must have DEFAULTs
          yield* sql`CREATE TABLE blobs (
            id BLOB NOT NULL PRIMARY KEY,
            bin BLOB NOT NULL DEFAULT x''
          )`
          yield* crsql.asCrr("blobs")

          // Insert a deterministic BLOB id + BLOB payload
          const idHex = "0123456789ABCDEF0123456789ABCDEF"
          const binHex = "DEADBEEF00FF11223344556677889900"
          yield* sql`INSERT INTO blobs (id, bin) VALUES (unhex(${idHex}), unhex(${binHex}))`

          // Export changes in serialized transport shape
          const changes = yield* crsql.pullChanges("0")
          return { changes, idHex, binHex }
        }).pipe(Effect.provide(layer))
      })

      assert.ok(source.changes.length > 0)
      // Sanity: ensure at least one BLOB column change was exported
      assert.ok(
        source.changes.some((c) => c.table === "blobs" && c.cid === "bin" && c.val_type === "blob")
      )

      // Stage 2: Apply to a fresh DB and verify round-trip via hex()
      yield* Effect.gen(function*() {
        const layer = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

        yield* Effect.gen(function*() {
          const sql = yield* NodeSqlite.SqliteClient.SqliteClient
          const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })

          // NOTE: CRR requirement — all NOT NULL, non-PK columns must have DEFAULTs
          yield* sql`CREATE TABLE blobs (
            id BLOB NOT NULL PRIMARY KEY,
            bin BLOB NOT NULL DEFAULT x''
          )`
          yield* crsql.asCrr("blobs")

          // Critical path: applyChanges must decode transport hex to BLOBs
          yield* crsql.applyChanges(source.changes)

          const rows = yield* sql<{ id: string; bin: string }>`
            SELECT hex(id) as id, hex(bin) as bin FROM blobs
          `
          assert.deepEqual(rows, [{ id: source.idHex, bin: source.binHex }])
        }).pipe(Effect.provide(layer))
      })
    }))
})
