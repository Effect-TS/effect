import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import * as Client from "@effect/sql-sqlite-node/Client"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

const makeClient = Effect.gen(function*(_) {
  const fs = yield* _(FileSystem.FileSystem)
  const dir = yield* _(fs.makeTempDirectoryScoped())
  return yield* _(Client.make({
    filename: dir + "/test.db"
  }))
}).pipe(Effect.provide(NodeFileSystem.layer))

describe("Client", () => {
  it.scoped("should work", () =>
    Effect.gen(function*(_) {
      const sql = yield* _(makeClient)
      yield* _(sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`)
      yield* _(sql`INSERT INTO test (name) VALUES ('hello')`)
      let rows = yield* _(sql`SELECT * FROM test`)
      assert.deepStrictEqual(rows, [{ id: 1, name: "hello" }])
      yield* _(sql`INSERT INTO test (name) VALUES ('world')`, sql.withTransaction)
      rows = yield* _(sql`SELECT * FROM test`)
      assert.deepStrictEqual(rows, [
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
