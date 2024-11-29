import { Reactivity } from "@effect/experimental"
import { BunFileSystem } from "@effect/platform-bun"
import { FileSystem } from "@effect/platform/FileSystem"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { describe, expect, test } from "bun:test"
import { Effect, pipe } from "effect"

const makeClient = Effect.gen(function*() {
  const fs = yield* FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return yield* SqliteClient.make({
    filename: dir + "/test.db"
  })
}).pipe(Effect.provide([BunFileSystem.layer, Reactivity.layer]))

describe("Client", () => {
  test("works", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql`INSERT INTO test (name) VALUES ('hello')`
      let rows = yield* sql`SELECT * FROM test`
      expect(rows).toEqual([{ id: 1, name: "hello" }])
      yield* pipe(sql`INSERT INTO test (name) VALUES ('world')`, sql.withTransaction)
      rows = yield* sql`SELECT * FROM test`
      expect(rows).toEqual([
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }).pipe(Effect.scoped, Effect.runPromise))
})
