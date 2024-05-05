import { BunFileSystem } from "@effect/platform-bun"
import { FileSystem } from "@effect/platform/FileSystem"
import * as Sqlite from "@effect/sql-sqlite-bun"
import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

const makeClient = Effect.gen(function*(_) {
  const fs = yield* _(FileSystem)
  const dir = yield* _(fs.makeTempDirectoryScoped())
  return yield* _(Sqlite.client.make({
    filename: dir + "/test.db"
  }))
}).pipe(Effect.provide(BunFileSystem.layer))

describe("Client", () => {
  test("works", () =>
    Effect.gen(function*(_) {
      const sql = yield* _(makeClient)
      yield* _(sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`)
      yield* _(sql`INSERT INTO test (name) VALUES ('hello')`)
      let rows = yield* _(sql`SELECT * FROM test`)
      expect(rows).toEqual([{ id: 1, name: "hello" }])
      yield* _(sql`INSERT INTO test (name) VALUES ('world')`, sql.withTransaction)
      rows = yield* _(sql`SELECT * FROM test`)
      expect(rows).toEqual([
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }).pipe(Effect.scoped, Effect.runPromise))
})
