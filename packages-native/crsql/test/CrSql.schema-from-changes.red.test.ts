import { CrSql } from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as Console from "effect/Console"
import { createTodosCrr, ensureCrSqlLoaded } from "./_helpers.js"

// TDD style: red test first for a feature we wish existed.
// Goal: derive a schema from exported CR-SQLite changes, apply it via automigrate
// to a fresh DB, then apply those changes successfully.
//
// NOTE: This test is intentionally skipped for v0.0.0 release.
// The __experimental__schemaFromChanges feature is implemented but these integration
// tests remain red/skipped until the feature is fully validated and stabilized.

layer(Layer.mergeAll(Reactivity.layer, Layer.scope))((it) => {
  it.scoped.skip("CrSql.schemaFromChanges -> automigrate -> applyChanges (RED): can recreate schema for exported changes and apply them", () =>
    Effect.gen(function*() {
      // Stage 1: Produce realistic changes from an existing CRR table
      const exported = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const sql = yield* SqlClient.SqlClient
        const pk1 = "00112233445566778899AABBCCDDEEFF"
        const pk2 = "FFEEDDCCBBAA99887766554433221100"
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex(${pk1}), 'Alpha', 0)`
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (unhex(${pk2}), 'Beta', 1)`
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.pullChanges("0")
      }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" })))

      assert.ok(exported.length > 0)
      // Sanity: contains todos/content and todos/completed deltas
      assert.ok(exported.some((c) => c.table === "todos" && c.cid === "content"))
      assert.ok(exported.some((c) => c.table === "todos" && c.cid === "completed"))

      // Stage 2: Derive schema from the exported changes
      const schema = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        // New API under test: derive a SQLite schema suitable for crsql_automigrate
        return yield* crsql.__experimental__schemaFromChanges(exported)
      }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" })))

      // The derived schema should target the todos table and enable CRR
      assert.ok(schema.includes("CREATE TABLE IF NOT EXISTS todos"))
      assert.ok(schema.includes("SELECT crsql_as_crr('todos')"))

      // Stage 3: Apply the derived schema to a fresh DB, then apply the changes
      yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        yield* Console.debug(schema)
        yield* crsql.automigrate(schema)
        yield* crsql.applyChanges(exported)

        // Verify both rows are present and match values
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<{ content: string; completed: number }>`
          SELECT content, completed FROM todos ORDER BY content ASC
        `
        assert.deepEqual(rows, [
          { content: "Alpha", completed: 0 },
          { content: "Beta", completed: 1 }
        ])
      }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" })))
    }))
})
