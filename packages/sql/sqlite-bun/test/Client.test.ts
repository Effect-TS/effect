import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import { rm } from "node:fs/promises"

const isBun = "bun" in process.versions

describe("Client", () => {
  it.effect("should work", () => Effect.void)

  it.effect.skipIf(!isBun)("readonly clients reject writes", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-readonly-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(
        Effect.void,
        () => Effect.promise(() => rm(filename, { force: true }))
      )

      yield* Effect.scoped(
        Effect.gen(function*() {
          const sql = yield* SqliteClient.make({ filename })
          yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`
        })
      )

      const sql = yield* SqliteClient.make({ filename, readonly: true })
      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [])

      const error = yield* Effect.flip(sql`INSERT INTO test DEFAULT VALUES`)
      assert.strictEqual(error._tag, "SqlError")
      assert(error.reason.cause instanceof Error)
      assert.match(error.reason.cause.message, /attempt to write a readonly database/i)
    }).pipe(Effect.provide(Reactivity.layer)))
})
