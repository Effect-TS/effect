import { CrSql } from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"
import * as Layer from "effect/Layer"

function maxVersionAndSeq(
  changes: ReadonlyArray<{
    db_version: string
    seq: number
  }>
) {
  const maxV = changes.reduce((m, c) => Math.max(m, Number(c.db_version)), 0)
  const maxVStr = String(maxV)
  const maxSeq = changes
    .filter((c) => c.db_version === maxVStr)
    .reduce((m, c) => Math.max(m, c.seq), 0)
  return { version: maxVStr, seq: maxSeq }
}

layer(Layer.mergeAll(Reactivity.layer, Layer.scope))((it) => {
  it.scoped("Whole CRR Sync via crsql_changes + crsql_tracked_peers: first sync A→B and cursor update", () =>
    Effect.gen(function*() {
      const layerA = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const layerB = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

      // Get B's site id first (used for exclude when pulling from A)
      const siteB = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        return yield* crsql.getSiteIdHex
      }).pipe(Effect.provide(layerB))

      // A: init schema, insert, export changes excluding B
      const fromA = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.sql`CREATE TABLE items (
          id BLOB NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        const id1 = "AAAABBBBCCCCDDDDEEEEFFFF00001111"
        const id2 = "11110000FFFFEEEEDDDDCCCCBBBBAAAA"
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id1}), 'one')`
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id2}), 'two')`
        const siteA = yield* crsql.getSiteIdHex
        const changes = yield* crsql.pullChanges("0", [siteB])
        return { changes, siteA, id1, id2 }
      }).pipe(Effect.provide(layerA))

      // B: init schema, apply, verify, update cursor
      yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.sql`CREATE TABLE items (
          id BLOB NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        yield* crsql.applyChanges(fromA.changes)
        const rowsB = yield* crsql.sql<{ id: string; text: string }>`
          SELECT hex(id) as id, text FROM items ORDER BY text
        `
        assert.deepEqual(rowsB, [
          { id: fromA.id1, text: "one" },
          { id: fromA.id2, text: "two" }
        ])
        const { seq, version } = maxVersionAndSeq(fromA.changes)
        yield* crsql.setPeerVersion({ siteId: fromA.siteA, version, seq })
        const cursor = yield* crsql.getPeerVersion(fromA.siteA)
        assert.ok(cursor !== null && cursor.version === version)
      }).pipe(Effect.provide(layerB))
    }))

  it.scoped("Whole CRR Sync via crsql_changes + crsql_tracked_peers: incremental sync A→B using tracked cursor", () =>
    Effect.gen(function*() {
      const layerA = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const layerB = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

      // B's site id (exclude)
      const siteB = yield* Effect.provide(
        Effect.gen(function*() {
          const sql = yield* NodeSqlite.SqliteClient.SqliteClient
          const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
          return yield* crsql.getSiteIdHex
        }),
        layerB
      )

      // A: do both writes & exports on the SAME connection
      const a = yield* Effect.provide(
        Effect.gen(function*() {
          const sql = yield* NodeSqlite.SqliteClient.SqliteClient
          const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
          // init
          yield* crsql.automigrate`
            CREATE TABLE items (
              id BLOB NOT NULL PRIMARY KEY,
              text TEXT NOT NULL DEFAULT ''
            );
            SELECT crsql_as_crr('items');
          `
          const id1 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
          yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id1}), 'first')`
          const siteA = yield* crsql.getSiteIdHex
          const first = yield* crsql.pullChanges("0", [siteB])

          // next write
          const id2 = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
          yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id2}), 'second')`
          const since = maxVersionAndSeq(first).version
          const next = yield* crsql.pullChanges(since, [siteB])
          return { siteA, first, next }
        }),
        layerA
      )

      // B: apply both sets on the SAME connection and verify
      yield* Effect.provide(
        Effect.gen(function*() {
          const sql = yield* NodeSqlite.SqliteClient.SqliteClient
          const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
          // init
          yield* crsql.automigrate`
            CREATE TABLE items (
              id BLOB NOT NULL PRIMARY KEY,
              text TEXT NOT NULL DEFAULT ''
            );
            SELECT crsql_as_crr('items');
          `
          // apply first & set cursor
          yield* crsql.applyChanges(a.first)
          const { seq, version } = maxVersionAndSeq(a.first)
          yield* crsql.setPeerVersion({ siteId: a.siteA, version, seq })
          // apply next
          yield* crsql.applyChanges(a.next)
          const rows = yield* crsql.sql<{ t: string }>`SELECT text as t FROM items ORDER BY t`
          assert.deepEqual(rows.map((r) => r.t), ["first", "second"])
        }),
        layerB
      )
    }))

  it.scoped("Whole CRR Sync via crsql_changes + crsql_tracked_peers: two-way sync A⇄B with exclusion prevents echo", () =>
    Effect.gen(function*() {
      // Use one in-memory connection per replica and reuse it across steps
      const clientA = yield* NodeSqlite.SqliteClient.make({ filename: ":memory:" })
      const clientB = yield* NodeSqlite.SqliteClient.make({ filename: ":memory:" })

      // Site ids and schema init
      const siteA = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: clientA })
        yield* crsql.sql`CREATE TABLE items (
          id TEXT NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        return yield* crsql.getSiteIdHex
      })
      const siteB = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: clientB })
        yield* crsql.sql`CREATE TABLE items (
          id TEXT NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        return yield* crsql.getSiteIdHex
      })

      // A writes and B syncs
      const changesA1 = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: clientA })
        const id1 = "id1"
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (${id1}, 'fromA')`
        const changes = yield* crsql.pullChanges("0", [siteB])
        return changes
      })
      yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: clientB })
        yield* crsql.applyChanges(changesA1)
        const { seq, version } = maxVersionAndSeq(changesA1)
        yield* crsql.setPeerVersion({ siteId: siteA, version, seq })
      })

      // B writes and A syncs (exclude siteA, so A doesn't re-receive its own changes)
      const changesB1 = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: clientB })
        const id2 = "id2"
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (${id2}, 'fromB')`
        const changes = yield* crsql.pullChanges("0", [siteA])
        return changes
      })
      yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: clientA })
        yield* crsql.applyChanges(changesB1)
      })

      // Verify convergence
      const rowsA = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: clientA })
        const rows = yield* crsql.sql<{ t: string }>`SELECT text as t FROM items ORDER BY t`
        return rows.map((r) => r.t)
      })
      const rowsB = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: clientB })
        const rows = yield* crsql.sql<{ t: string }>`SELECT text as t FROM items ORDER BY t`
        return rows.map((r) => r.t)
      })
      assert.deepEqual(rowsA, ["fromA", "fromB"])
      assert.deepEqual(rowsB, ["fromA", "fromB"])
    }))
})
