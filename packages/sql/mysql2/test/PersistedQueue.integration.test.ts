import { MysqlClient } from "@effect/sql-mysql2"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schedule, Schema } from "effect"
import { PersistedQueue } from "effect/unstable/persistence"
import { MysqlContainer } from "./utils.ts"

// SET timestamp is session-local. One connection ensures the queue's SQL and
// the assertions use the same frozen database clock, including background polls.
const client = Layer.unwrap(Effect.gen(function*() {
  const container = yield* MysqlContainer
  return MysqlClient.layer({
    url: Redacted.make(container.getConnectionUri()),
    maxConnections: 1
  })
})).pipe(Layer.provide(MysqlContainer.layer))

const layer = PersistedQueue.layer.pipe(
  Layer.provideMerge(PersistedQueue.layerStoreSql({ tableName: "retry_precision" })),
  Layer.provideMerge(client)
)

it.layer(layer, { timeout: "60 seconds", concurrent: false })("PersistedQueue MySQL retry precision", (it) => {
  for (const phase of [0, 250, 750, 950]) {
    it.effect(`preserves the 500 ms retry minimum at second phase ${phase} ms`, () =>
      Effect.gen(function*() {
        const sql = yield* MysqlClient.MysqlClient
        const timestamp = 1_800_000_000 + phase / 1000
        yield* sql`SET timestamp = ${timestamp}`
        yield* Effect.addFinalizer(() => sql`SET timestamp = DEFAULT`.pipe(Effect.orDie))
        const clock = yield* sql<{ phase: number }>`SELECT MICROSECOND(NOW(6)) AS phase`
        assert.strictEqual(clock[0].phase, phase * 1000)

        const queue = yield* PersistedQueue.make({
          name: `retry-precision-${phase}`,
          schema: Schema.Number,
          retrySchedule: Schedule.spaced(500)
        })
        yield* queue.offer(42)
        assert.strictEqual(yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip), "boom")

        // Measure the persisted deadline against NOW(6), not updated_at: both
        // NOW() and the existing DATETIME columns lack fractional precision.
        // Freezing MySQL time avoids TestClock/live-clock scheduling races.
        const rows = yield* sql<{ delay_us: number; attempts: number; state: string }>`
          SELECT TIMESTAMPDIFF(MICROSECOND, NOW(6), visible_at) AS delay_us, attempts, state
          FROM retry_precision WHERE queue_name = ${`retry-precision-${phase}`}
        `
        assert.strictEqual(rows.length, 1)
        assert.strictEqual(rows[0].attempts, 1)
        assert.strictEqual(rows[0].state, "pending")
        assert.isAtLeast(Number(rows[0].delay_us), 500_000)

        yield* sql`SET timestamp = ${timestamp + 2}`
        assert.strictEqual(yield* queue.take((_, { attempts }) => Effect.succeed(attempts)), 2)
      }), { timeout: 10_000 })
  }
})
