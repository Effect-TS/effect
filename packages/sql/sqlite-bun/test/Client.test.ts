import { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import * as SqliteClient from "../src/SqliteClient.ts"

describe("Client", () => {
  test("should work", () => Effect.runPromise(Effect.void))

  test("readonly clients reject writes", async () => {
    const filename = `/tmp/effect-sqlite-bun-readonly-${crypto.randomUUID()}.db`
    const db = new Database(filename, { create: true })
    db.run("CREATE TABLE test (id INTEGER PRIMARY KEY)")
    db.close()

    try {
      const write = Effect.scoped(
        Effect.gen(function*() {
          const sql = yield* SqliteClient.make({ filename, readonly: true })
          yield* sql`INSERT INTO test DEFAULT VALUES`
        })
      ).pipe(Effect.provide(Reactivity.layer), Effect.runPromise)
      await expect(write).rejects.toBeDefined()
    } finally {
      await Bun.file(filename).delete()
    }
  })
})
