import { Reactivity } from "@effect/experimental"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"

const isBun = "bun" in process.versions

describe("Client", () => {
  it.effect("should work", () => Effect.void)

  it.scoped.skipIf(!isBun)("starts transactions immediately", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `${tmpdir()}/effect-sqlite-bun-${crypto.randomUUID()}.db`
      yield* Effect.addFinalizer(() =>
        Effect.promise(() => Promise.all(["", "-wal", "-shm"].map((suffix) => rm(filename + suffix, { force: true }))))
      )

      const client = yield* SqliteClient.make({ filename })
      const contender = yield* SqliteClient.make({ filename })
      const conn = yield* contender.reserve
      yield* conn.executeRaw("PRAGMA busy_timeout = 1", [])

      yield* client.withTransaction(
        Effect.gen(function*() {
          const error = yield* Effect.flip(conn.executeRaw("BEGIN IMMEDIATE", []))
          assert.strictEqual(error._tag, "SqlError")
          assert(error.cause instanceof Error)
          assert.match(error.cause.message, /database is locked/i)
        })
      )
    }).pipe(Effect.provide(Reactivity.layer)))
})
