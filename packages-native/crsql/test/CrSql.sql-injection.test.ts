import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"

const DbMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

layer(DbMem)((it) => {
  it.scoped("parameterized values prevent SQL injection (text)", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE safe (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`

      const injected = "abc'); DROP TABLE safe; --"
      // If templates were not parameterized, this could drop the table.
      yield* sql`INSERT INTO safe (name) VALUES (${injected})`

      // Table still exists and row is stored literally
      const [exists] = yield* sql<{ n: number }>`
        SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'safe'
      `
      assert.strictEqual(exists.n, 1)
      const [row] = yield* sql<{ name: string }>`SELECT name FROM safe LIMIT 1`
      assert.strictEqual(row.name, injected)
    }))

  it.scoped("parameterized values prevent SQL injection (numeric string)", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE nums (val INTEGER NOT NULL)`
      const injectedNumber = "0); DROP TABLE nums; --" // string payload
      yield* sql`INSERT INTO nums (val) VALUES (${injectedNumber})`
      const [exists] = yield* sql<{ n: number }>`
        SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'nums'
      `
      assert.strictEqual(exists.n, 1)
      // Text is stored; table intact. Using CAST to make the contract explicit.
      const [row] = yield* sql<{ val: string }>`SELECT CAST(val AS TEXT) AS val FROM nums LIMIT 1`
      assert.strictEqual(row.val, injectedNumber)
    }))

  it.scoped("parameterized values inside functions are safe (unhex)", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE safe_blob (id BLOB PRIMARY KEY, note TEXT NOT NULL)`
      // Hex for the ASCII string "ABC'; DROP TABLE safe_blob; --" (not executed; just data)
      const hexPayload = Buffer.from("ABC'; DROP TABLE safe_blob; --", "utf8").toString("hex").toUpperCase()
      yield* sql`INSERT INTO safe_blob (id, note) VALUES (unhex(${hexPayload}), 'ok')`

      const [exists] = yield* sql<{ n: number }>`
        SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'safe_blob'
      `
      assert.strictEqual(exists.n, 1)
      const [row] = yield* sql<{ note: string }>`SELECT note FROM safe_blob LIMIT 1`
      assert.strictEqual(row.note, "ok")
    }))
})
