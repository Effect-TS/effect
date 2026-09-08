import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, it } from "@effect/vitest"
import { Duration, Effect, Fiber, Layer, Schedule, Schema } from "effect"
import { TestClock } from "effect/testing"
import { PersistedQueue } from "effect/unstable/persistence"

const layer = PersistedQueue.layer.pipe(
  Layer.provideMerge(PersistedQueue.layerStoreSql({ pollInterval: "5 millis" })),
  Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" }))
)

it.layer(layer, { concurrent: false })("PersistedQueue SQLite retry precision", (it) => {
  for (const delay of [0, 0.001, 0.5, 1, 500, 2500]) {
    it.effect(`preserves a ${delay} ms retry rounded up to SQLite clock precision`, () =>
      Effect.gen(function*() {
        const sql = yield* SqliteClient.SqliteClient
        const name = `duration-${delay}`
        const queue = yield* PersistedQueue.make({ name, schema: Schema.Number, retrySchedule: Schedule.spaced(delay) })
        yield* queue.offer(42)
        const failedAt = Date.now()
        assert.strictEqual(yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip), "boom")
        // Both timestamps are written in the retry UPDATE, so database latency
        // cannot change the measured interval. Round away julianday float error.
        const rows = yield* sql<{ delay_ms: number }>`SELECT
          ROUND((julianday(visible_at) - julianday(updated_at)) * 86400000) AS delay_ms
          FROM effect_queue WHERE queue_name = ${name}`
        assert.strictEqual(rows[0].delay_ms, Math.ceil(delay))
        assert.strictEqual(yield* queue.take((_, { attempts }) => Effect.succeed(attempts)), 2)
        assert.isAtLeast(Date.now() - failedAt, Math.ceil(delay))
      }).pipe(TestClock.withLive), { timeout: 10_000 })
  }

  it.effect(
    "delivers and cleans up legacy whole-second rows without exposing future rows",
    () =>
      Effect.gen(function*() {
        const sql = yield* SqliteClient.SqliteClient
        const store = yield* PersistedQueue.makeStoreSql({ tableName: "legacy_queue", pollInterval: 5 })
        const factory = yield* PersistedQueue.makeFactory.pipe(
          Effect.provideService(PersistedQueue.PersistedQueueStore, store)
        )
        yield* sql`INSERT INTO legacy_queue
        (id, queue_name, element, state, attempts, visible_at, acquired_at, acquired_by, created_at, updated_at)
        VALUES
        ('old', 'legacy', '42', 'pending', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00', 'old-worker',
          '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
        ('future', 'legacy', '43', 'pending', 0, '2099-01-01 00:00:00', NULL, NULL,
          '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
        ('done', 'legacy', '44', 'completed', 1, '2026-01-01 00:00:00', NULL, NULL,
          '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
        ('failed', 'legacy', '45', 'failed', 3, '2026-01-01 00:00:00', NULL, NULL,
          '2026-01-01 00:00:00', '2026-01-01 00:00:00')`
        yield* store.cleanup({ timeToLive: Duration.seconds(1), failedTimeToLive: Duration.seconds(1) })
        assert.deepStrictEqual(yield* sql`SELECT id FROM legacy_queue ORDER BY id`, [{ id: "future" }, { id: "old" }])
        const queue = yield* factory.make({ name: "legacy", schema: Schema.Number })
        const result = yield* queue.take((value, { attempts }) => Effect.succeed({ value, attempts }))
        assert.deepStrictEqual(result, { value: 42, attempts: 2 })
        const fiber = yield* queue.take(Effect.succeed).pipe(Effect.forkScoped)
        yield* Effect.sleep(50)
        assert.isUndefined(fiber.pollUnsafe())
        yield* Fiber.interrupt(fiber)
        const future = yield* sql`SELECT visible_at, attempts FROM legacy_queue WHERE id = 'future'`
        assert.deepStrictEqual(future, [{ visible_at: "2099-01-01 00:00:00", attempts: 0 }])
      }).pipe(TestClock.withLive),
    { timeout: 10_000 }
  )

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
            // Fail late in the second, where whole-second rounding redelivered early.
            const rows = yield* sql<{ phase: number }>`SELECT
              CAST(substr(strftime('%f', 'now'), 4) AS INTEGER) AS phase`
            yield* Effect.sleep((1880 - rows[0].phase) % 1000)
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
