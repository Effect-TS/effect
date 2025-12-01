import { PersistedQueue } from "@effect/experimental"
import * as RedisPersistedQueue from "@effect/experimental/PersistedQueue/Redis"
import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Schema, TestClock, TestServices } from "effect"
import { RedisContainer } from "./utils/redis.js"

const layerMemory = PersistedQueue.layer.pipe(
  Layer.provide(PersistedQueue.layerStoreMemory)
)

const layerRedis = PersistedQueue.layer.pipe(
  Layer.provide(Layer.unwrapEffect(Effect.gen(function*() {
    const container = yield* RedisContainer
    return RedisPersistedQueue.layerStore({
      host: container.getHost(),
      port: container.getMappedPort(6379)
    })
  }))),
  Layer.provide(RedisContainer.layer)
)
;([
  ["Memory", layerMemory],
  ["Redis", layerRedis]
] as const).forEach(([name, layer]) => {
  it.layer(layer, { timeout: "30 seconds" })(`PersistedQueue (${name})`, (it) => {
    it.effect("offer + take", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-a",
          schema: Item
        })

        yield* queue.offer({ n: 42n })
        yield* queue.take(Effect.fnUntraced(function*(value) {
          assert.strictEqual(value.n, 42n)
        }))
      }))

    it.effect("interrupt", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-b",
          schema: Item
        })

        yield* queue.offer({ n: 42n })

        const latch = Effect.unsafeMakeLatch()
        const fiber = yield* queue.take(Effect.fnUntraced(function*(_value) {
          yield* latch.open
          return yield* Effect.never
        })).pipe(Effect.fork)

        const fiber2 = yield* queue.take((val) => Effect.succeed(val)).pipe(Effect.fork)

        yield* latch.await

        // allow some real time to pass to ensure the second take is really
        // waiting
        yield* TestClock.adjust(1000)
        yield* Effect.sleep(1000).pipe(
          TestServices.provideLive
        )
        assert.isNull(fiber2.unsafePoll())

        yield* Fiber.interrupt(fiber)

        yield* TestClock.adjust(1000)

        assert.strictEqual((yield* Fiber.join(fiber2)).n, 42n)
      }))

    it.effect("failure", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-c",
          schema: Item
        })

        yield* queue.offer({ n: 42n })

        const error = yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip)
        assert.strictEqual(error, "boom")

        const value = yield* queue.take((val, { attempts }) => {
          assert.strictEqual(attempts, 1)
          return Effect.succeed(val)
        })
        assert.strictEqual(value.n, 42n)
      }))

    it.effect("idempotent offer", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "idempotent-offer",
          schema: Item
        })

        yield* queue.offer({ n: 42n }, { id: "custom-id" })
        yield* queue.offer({ n: 42n }, { id: "custom-id" })
        yield* queue.take(Effect.fnUntraced(function*(value) {
          assert.strictEqual(value.n, 42n)
        }))
        const fiber = yield* queue.take(Effect.fnUntraced(function*(value) {
          assert.strictEqual(value.n, 42n)
        })).pipe(Effect.fork)

        yield* TestClock.adjust(1000)
        yield* Effect.sleep(1000).pipe(
          TestServices.provideLive
        )

        assert.isNull(fiber.unsafePoll())
      }))
  })
})

const Item = Schema.Struct({
  n: Schema.BigInt
})
