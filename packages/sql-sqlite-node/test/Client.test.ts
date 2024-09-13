import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

const makeClient = Effect.gen(function*(_) {
  const fs = yield* _(FileSystem.FileSystem)
  const dir = yield* _(fs.makeTempDirectoryScoped())
  return yield* _(SqliteClient.make({
    filename: dir + "/test.db"
  }))
}).pipe(Effect.provide(NodeFileSystem.layer))

describe("Client", () => {
  it.scoped("should work", () =>
    Effect.gen(function*(_) {
      const sql = yield* _(makeClient)
      let response
      response = yield* _(sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`)
      assert.deepStrictEqual(response, [])
      response = yield* _(sql`INSERT INTO test (name) VALUES ('hello')`)
      assert.deepStrictEqual(response, [])
      response = yield* _(sql`SELECT * FROM test`)
      assert.deepStrictEqual(response, [{ id: 1, name: "hello" }])
      response = yield* _(sql`INSERT INTO test (name) VALUES ('world')`, sql.withTransaction)
      assert.deepStrictEqual(response, [])
      response = yield* _(sql`SELECT * FROM test`)
      assert.deepStrictEqual(response, [
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }))

  it.scoped("should work with raw", () =>
    Effect.gen(function*(_) {
      const sql = yield* _(makeClient)
      let response
      response = yield* _(sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`.raw)
      assert.deepStrictEqual(response, { changes: 0, lastInsertRowid: 0 })
      response = yield* _(sql`INSERT INTO test (name) VALUES ('hello')`.raw)
      assert.deepStrictEqual(response, { changes: 1, lastInsertRowid: 1 })
      response = yield* _(sql`SELECT * FROM test`.raw)
      assert.deepStrictEqual(response, [{ id: 1, name: "hello" }])
      response = yield* _(sql`INSERT INTO test (name) VALUES ('world')`.raw, sql.withTransaction)
      assert.deepStrictEqual(response, { changes: 1, lastInsertRowid: 2 })
      response = yield* _(sql`SELECT * FROM test`)
      assert.deepStrictEqual(response, [
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }))

  it.scoped("withTransaction", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql.withTransaction(sql`INSERT INTO test (name) VALUES ('hello')`)
      const rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [{ id: 1, name: "hello" }])
    }))

  it.scoped("withTransaction rollback", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql`INSERT INTO test (name) VALUES ('hello')`.pipe(
        Effect.andThen(Effect.fail("boom")),
        sql.withTransaction,
        Effect.ignore
      )
      const rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [])
    }))
})
