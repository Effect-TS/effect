import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Schedule, Schema } from "effect"
import { TestClock } from "effect/testing"
import { PersistedQueue } from "effect/unstable/persistence"

const layer = PersistedQueue.layer.pipe(
  Layer.provideMerge(PersistedQueue.layerStoreSql({ pollInterval: "5 millis" })),
  Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" }))
)

it.layer(layer)("PersistedQueue SQLite retry precision", (it) => {
  it.effect("does not redeliver a 500 ms retry early near a second boundary", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.SqliteClient
      const queue = yield* PersistedQueue.make({
        name: "boundary",
        schema: Schema.Number,
        retrySchedule: Schedule.spaced(500)
      })
      yield* queue.offer(42)
      let failedAt = 0
      assert.strictEqual(
        yield* queue.take(() =>
          Effect.gen(function*() {
            // Use SQLite's real clock. TestClock cannot advance SQLite's 'now'.
            // A short poll interval exposes early eligibility hidden by 1s polling.
            while (true) {
              const rows = yield* sql<{ phase: number }>`SELECT
            CAST(substr(strftime('%f', 'now'), 4) AS INTEGER) AS phase`
              if (rows[0].phase >= 850 && rows[0].phase < 900) break
              yield* Effect.sleep(5)
            }
            failedAt = Date.now()
            return yield* Effect.fail("boom")
          })
        ).pipe(Effect.flip),
        "boom"
      )
      const result = yield* queue.take((value, { attempts }) =>
        Effect.succeed({
          value,
          attempts,
          elapsed: Date.now() - failedAt
        })
      )
      assert.strictEqual(result.value, 42)
      assert.strictEqual(result.attempts, 2)
      assert.isAtLeast(result.elapsed, 500)
    }).pipe(TestClock.withLive), { timeout: 10_000 })
})
