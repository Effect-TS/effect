import { assert } from "@effect/vitest"
import type { Vitest } from "@effect/vitest"
import { Clock, type Duration, Effect, Fiber, Layer, Option, Schema } from "effect"
import { PersistedQueue } from "effect/persistence"
import { SqlClient } from "effect/sql"
import { TestClock } from "effect/testing"

const makeQueue = Effect.fnUntraced(function*(tableName: string, pollInterval: Duration.Input = "10 millis") {
  const store = yield* PersistedQueue.makeStoreSql({ tableName, pollInterval })
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

    it.effect("wakes a waiting taker once an offer made inside a transaction commits", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        // no test waits out this poll interval: only the offer's wake-up can
        // deliver the element
        const queue = yield* makeQueue("effect_queue_commit_wake", "1 hour")
        const taken = yield* queue.take(Effect.succeed).pipe(Effect.forkScoped)

        // the transaction stays open after the offer, long enough for a wake-up
        // sent before the commit to find nothing
        yield* queue.offer("committed").pipe(
          Effect.andThen(Effect.sleep("500 millis")),
          sql.withTransaction
        )

        const value = yield* Fiber.join(taken).pipe(Effect.timeoutOption("5 seconds"))
        assert.deepStrictEqual(value, Option.some("committed"))
      }).pipe(TestClock.withLive), { timeout: 30000 })
  })
