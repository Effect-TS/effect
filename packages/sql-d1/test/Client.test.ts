import { D1Client } from "@effect/sql-d1"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { D1Miniflare } from "./utils.js"

describe("Client", () => {
  it.scoped("should handle queries without transactions", () =>
    Effect.gen(function*(_) {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql`INSERT INTO test (name) VALUES ('hello')`
      let rows = yield* _(sql`SELECT * FROM test`)
      assert.deepStrictEqual(rows, [{ id: 1, name: "hello" }])
      yield* sql`INSERT INTO test (name) VALUES ('world')`
      rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }).pipe(Effect.provide(D1Miniflare.ClientLive)))
})
