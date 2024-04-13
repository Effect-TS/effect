import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import * as Client from "@effect/sql-sqlite-node/Client"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

const createClient = Effect.gen(function*(_) {
  const fs = yield* _(FileSystem.FileSystem)
  const dir = yield* _(fs.makeTempDirectoryScoped())
  return yield* _(Client.make({
    filename: dir + "/test.db"
  }))
}).pipe(Effect.provide(NodeFileSystem.layer))

describe("Client", () => {
  it.effect("should work", () =>
    Effect.gen(function*(_) {
      const sql = yield* _(createClient)
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
    }).pipe(Effect.scoped))
})
