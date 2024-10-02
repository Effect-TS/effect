import { LibsqlClient } from "@effect/sql-libsql"
import { assert, describe, layer } from "@effect/vitest"
import { Cause, Effect } from "effect"
import { LibsqlContainer } from "./util.js"

describe("Client", () => {
  layer(LibsqlContainer.ClientLive)((it) => {
    it.scoped("should work", () =>
      Effect.gen(function*() {
        const sql = yield* LibsqlClient.LibsqlClient
        let response
        response = yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
        yield* Effect.addFinalizer(() => sql`DROP TABLE test;`.pipe(Effect.ignore))
        assert.deepStrictEqual(response, [])
        response = yield* sql`INSERT INTO test (name) VALUES ('hello')`
        assert.deepStrictEqual(response, [])
        response = yield* sql`SELECT * FROM test`
        assert.deepStrictEqual(response, [{ id: 1, name: "hello" }])
        response = yield* sql`SELECT * FROM test`
        assert.deepStrictEqual(yield* sql`select * from test`.values, [
          [1, "hello"]
        ])
      }))

    it.scoped("should work with raw", () =>
      Effect.gen(function*() {
        const sql = yield* LibsqlClient.LibsqlClient
        let response: any
        response = yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`.raw
        yield* Effect.addFinalizer(() => sql`DROP TABLE test;`.pipe(Effect.ignore))
        assert.deepStrictEqual(response.toJSON(), {
          columnTypes: [],
          columns: [],
          lastInsertRowid: null,
          rows: [],
          rowsAffected: 0
        })
        response = yield* sql`INSERT INTO test (name) VALUES ('hello')`.raw
        assert.deepStrictEqual(response.toJSON(), {
          columnTypes: [],
          columns: [],
          lastInsertRowid: "1",
          rows: [],
          rowsAffected: 1
        })
        response = yield* sql`SELECT * FROM test`.raw
        assert.deepStrictEqual(response.toJSON(), {
          columnTypes: ["INTEGER", "TEXT"],
          columns: ["id", "name"],
          lastInsertRowid: null,
          rows: [[1, "hello"]],
          rowsAffected: 0
        })
      }))

    it.scoped("should defect on transactions", () =>
      Effect.gen(function*() {
        const sql = yield* LibsqlClient.LibsqlClient
        yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
        const res = yield* sql`INSERT INTO test ${sql.insert({ name: "hello" })}`.pipe(
          sql.withTransaction,
          Effect.catchAllDefect((defect) => Effect.succeed(defect))
        )
        const rows = yield* sql`SELECT * FROM test`
        assert.deepStrictEqual(rows, [])
        assert.equal(Cause.isRuntimeException(res), true)
      }))
  })
})
