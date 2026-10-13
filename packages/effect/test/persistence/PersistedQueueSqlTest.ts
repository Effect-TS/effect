import { assert } from "@effect/vitest"
import type { Vitest } from "@effect/vitest"
import { Clock, Effect, Layer, Schema } from "effect"
import { PersistedQueue } from "effect/persistence"
import { SqlClient } from "effect/sql"
import { TestClock } from "effect/testing"

const makeQueue = Effect.fnUntraced(function*(tableName: string) {
  const store = yield* PersistedQueue.makeStoreSql({ tableName, pollInterval: "10 millis" })
  const factory = yield* PersistedQueue.makeFactory.pipe(
    Effect.provideService(PersistedQueue.PersistedQueueStore, store)
  )
  return yield* factory.make({ name: tableName, schema: Schema.String })
})

// Delayed-offer timing checks that depend on how each SQL dialect reads the
// database clock. They run against the real clock, which the database shares
// when it runs on the same host. The tests run one at a time, since a
// transaction on a single-connection database would hold up the other test's
// offer.
export const suiteWith = (testApi: Vitest.MethodsNonLive<SqlClient.SqlClient>) =>
  testApi.layer(Layer.empty, { concurrent: false, timeout: "90 seconds" })("PersistedQueue SQL delays", (it) => {
    it.effect("never delivers a delayed offer early at a second boundary", () =>
      Effect.gen(function*() {
        const queue = yield* makeQueue("effect_queue_delay_boundary")

        // offer mid-way through a wall-clock second, so a whole-second database
        // clock drops about half a second from the start of the delay while a
        // slow insert still lands in the same second
        while (true) {
          const millis = (yield* Clock.currentTimeMillis) % 1000
          if (millis >= 500 && millis < 600) break
          yield* Effect.sleep(10)
        }

        const offeredAt = yield* Clock.currentTimeMillis
        yield* queue.offer("delayed", { delay: "1 second" })
        yield* queue.take(Effect.succeed)

        assert.isAtLeast((yield* Clock.currentTimeMillis) - offeredAt, 1000)
      }).pipe(TestClock.withLive), { timeout: 30000 })

    it.effect("measures the delay from an offer made inside a transaction", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const queue = yield* makeQueue("effect_queue_delay_transaction")

        // the transaction starts well before the offer
        const offeredAt = yield* Effect.gen(function*() {
          yield* Effect.sleep("2 seconds")
          const offeredAt = yield* Clock.currentTimeMillis
          yield* queue.offer("delayed", { delay: "3 seconds" })
          return offeredAt
        }).pipe(sql.withTransaction)
        yield* queue.take(Effect.succeed)

        assert.isAtLeast((yield* Clock.currentTimeMillis) - offeredAt, 3000)
      }).pipe(TestClock.withLive), { timeout: 30000 })
  })
