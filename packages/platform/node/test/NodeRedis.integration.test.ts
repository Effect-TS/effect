import { NodeRedis } from "@effect/platform-node"
import { assert, it } from "@effect/vitest"
import { RedisContainer } from "@testcontainers/redis"
import { Clock, Duration, Effect, Fiber, Latch, Layer, Queue, Schedule, Schema } from "effect"
import * as PersistedCacheTest from "effect-test/persistence/PersistedCacheTest"
import * as PersistedQueueTest from "effect-test/persistence/PersistedQueueTest"
import * as RateLimiterTest from "effect-test/persistence/RateLimiterTest"
import { PersistedQueue, Persistence, RateLimiter, Redis } from "effect/persistence"
import { TestClock } from "effect/testing"
import { createServer } from "node:net"

const RedisLayer = Layer.unwrap(
  Effect.gen(function*() {
    const container = yield* Effect.acquireRelease(
      Effect.promise(() => new RedisContainer("redis:alpine").start()),
      (container) => Effect.promise(() => container.stop())
    )
    return NodeRedis.layer({
      socket: {
        host: container.getHost(),
        port: container.getMappedPort(6379)
      }
    })
  }).pipe(
    Effect.catchCause(() => Effect.fail(new PersistedCacheTest.TransientError()))
  )
)

PersistedCacheTest.suite(
  "NodeRedis",
  Persistence.layerRedis.pipe(Layer.provide(RedisLayer))
)

PersistedQueueTest.suite(
  "NodeRedis",
  // short intervals so the periodic reset runs while the suite's takes are
  // in flight
  PersistedQueue.layerStoreRedis({
    pollInterval: "50 millis",
    lockRefreshInterval: "100 millis"
  }).pipe(Layer.provide(RedisLayer))
)

RateLimiterTest.suite(
  "NodeRedis",
  RateLimiter.layerStoreRedis().pipe(Layer.provide(RedisLayer))
)

it.layer(RateLimiter.layerStoreRedis().pipe(Layer.provideMerge(RedisLayer)), {
  timeout: "30 seconds",
  concurrent: false
})(
  "RateLimiter token-bucket storage (NodeRedis)",
  (it) => {
    it.effect("returns the persisted balance after accumulating fractional costs", () =>
      Effect.gen(function*() {
        const redis = yield* Redis.Redis
        const key = "fractional-persisted-balance"
        const results = yield* RateLimiterTest.consumeFractionalCosts(key)
        const stored = Number(yield* redis.send<string>("GET", `ratelimiter:${key}`))

        assert.strictEqual(stored, 3.9999999999999996)
        assert.strictEqual(results[results.length - 1].remaining, stored)
      }))

    it.effect(
      "does not restore capacity early after a fractional token cost",
      () =>
        Effect.gen(function*() {
          const redis = yield* Redis.Redis
          const store = yield* RateLimiter.RateLimiterStore
          const memory = yield* RateLimiter.RateLimiterStore.pipe(Effect.provide(RateLimiter.layerStoreMemory))
          const opts = {
            key: "fractional-cost-expiry",
            limit: 5,
            refillRate: Duration.seconds(4),
            allowOverflow: false
          }
          const key = `ratelimiter:${opts.key}`
          const refillKey = `${key}:refill`
          yield* memory.tokenBucket({ ...opts, tokens: 0.5 })
          yield* store.tokenBucket({ ...opts, tokens: 0.5 })
          const refillAt = Number(yield* redis.send<string>("GET", refillKey))
          assert.isAbove(yield* redis.send<number>("PTTL", key), 0)

          // Use wall time: the reported bug expires these keys after 2s, before the 4s refill.
          yield* Effect.sleep("2500 millis")
          const beforeRefill = {
            keys: yield* redis.send<number>("EXISTS", key, refillKey),
            tokens: yield* redis.send<string | null>("GET", key),
            memoryRemaining: (yield* memory.tokenBucket({ ...opts, tokens: 0 }))[0],
            redisRemaining: (yield* store.tokenBucket({ ...opts, tokens: 0 }))[0]
          }
          const elapsed = (yield* Clock.currentTimeMillis) - refillAt
          assert.isAtLeast(elapsed, 2_500)
          assert.isBelow(elapsed, 4_000)

          yield* Effect.sleep(4_100 - elapsed)
          assert.strictEqual((yield* memory.tokenBucket({ ...opts, tokens: 0 }))[0], 5)
          assert.strictEqual((yield* store.tokenBucket({ ...opts, tokens: 0 }))[0], 5)
          assert.deepStrictEqual(beforeRefill, { keys: 2, tokens: "4.5", memoryRemaining: 4.5, redisRemaining: 4.5 })
        }).pipe(TestClock.withLive),
      10_000
    )

    for (const onExceeded of ["fail", "delay"] as const) {
      it.effect(`${onExceeded}: restarts the refill interval after both Redis keys expire`, () => {
        const key = `timing-expired-${onExceeded}`
        const redisKey = `ratelimiter:${key}`
        const refillKey = `${redisKey}:refill`
        // TestClock does not advance Redis's expiry clock, so expire the keys by hand.
        const idle = Effect.gen(function*() {
          const redis = yield* Redis.Redis
          yield* TestClock.adjust("359 seconds")
          assert.strictEqual(yield* redis.send<number>("EXISTS", redisKey, refillKey), 2)
          assert.strictEqual(yield* redis.send<number>("PEXPIRE", redisKey, "0"), 1)
          assert.strictEqual(yield* redis.send<number>("PEXPIRE", refillKey, "0"), 1)
          assert.strictEqual(yield* redis.send<number>("EXISTS", redisKey, refillKey), 0)
        })
        return RateLimiterTest.restartsInterval(key, onExceeded, 5, idle)
      })
    }
  }
)

const PersistedQueueRedisLayer = Layer.mergeAll(
  RedisLayer,
  PersistedQueue.layer.pipe(
    Layer.provideMerge(
      PersistedQueue.layerStoreRedis().pipe(Layer.provide(RedisLayer))
    )
  )
)

it.effect("fails the initial connection by default", () =>
  Effect.gen(function*() {
    const port = yield* closedPort
    const error = yield* Layer.build(NodeRedis.layer({
      socket: {
        host: "127.0.0.1",
        port
      }
    })).pipe(Effect.flip)

    assert.instanceOf(error, Redis.RedisError)
  }))

it.layer(PersistedQueueRedisLayer, { timeout: "30 seconds" })(
  "PersistedQueue (NodeRedis)",
  (it) => {
    it.effect("uses the node-redis protocol default", () =>
      Effect.gen(function*() {
        const redis = yield* NodeRedis.NodeRedis
        assert.strictEqual(redis.client.options.RESP, undefined)
      }))

    it.effect("receives published messages", () =>
      Effect.gen(function*() {
        const redis = yield* Redis.Redis
        const subscription = yield* redis.subscribe("effect-test")

        yield* redis.send("PUBLISH", "effect-test", "hello")

        assert.deepStrictEqual(yield* Queue.take(subscription), {
          channel: "effect-test",
          message: "hello"
        })
      }))

    // The shared PersistedQueue suite can only assert that exhausted elements
    // are no longer delivered, which is also true if they are silently
    // dropped. There is no public API for reading failed elements, so
    // verifying they are preserved in the dead-letter list requires
    // inspecting Redis directly.
    it.effect("moves exhausted elements to the failed list", () =>
      Effect.gen(function*() {
        const redis = yield* NodeRedis.NodeRedis
        const queueName = "test-redis-failed"

        const queue = yield* PersistedQueue.make({
          name: queueName,
          schema: RedisItem,
          maxAttempts: 1
        })
        const id = yield* queue.offer({ n: 42 })
        const error = yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip)
        assert.strictEqual(error, "boom")

        const failed = yield* redis.use((client) => client.lRange(`effectq:${queueName}:failed`, 0, -1))
        assert.strictEqual(failed.length, 1)
        const failedItem = JSON.parse(failed[0])
        assert.strictEqual(failedItem.id, id)
        assert.deepStrictEqual(failedItem.element, { n: 42 })
        assert.strictEqual(failedItem.attempts, 1)

        const pending = yield* redis.use((client) => client.hLen(`effectq:${queueName}:pending`))
        assert.strictEqual(pending, 0)
      }))

    it.effect("success after lease expiry but before reset is not redelivered", () =>
      Effect.gen(function*() {
        const makeQueue = Effect.fnUntraced(function*(lockRefreshInterval: Duration.Input) {
          const store = yield* PersistedQueue.makeStoreRedis({
            prefix: "effectq-late-success:",
            pollInterval: "50 millis",
            lockExpiration: "1 second",
            lockRefreshInterval
          })
          const factory = yield* PersistedQueue.makeFactory.pipe(
            Effect.provideService(PersistedQueue.PersistedQueueStore, store)
          )
          return yield* factory.make({ name: "ownership", schema: RedisItem })
        })
        // Neither refresh nor reset can run again before this handler succeeds.
        const queue = yield* makeQueue("1 hour")
        yield* queue.offer({ n: 42 }, { id: "order-1" })
        yield* queue.take((_value, { attempts }) =>
          Effect.gen(function*() {
            assert.strictEqual(attempts, 1)
            // Redis owns the lease clock; let it expire without another claimant.
            yield* Effect.sleep("1100 millis")
          })
        )

        // Only now allow recovery to run: a recorded success must leave no work.
        const recovery = yield* makeQueue("100 millis")
        const duplicate = yield* recovery.take((_value, metadata) => Effect.succeed(metadata)).pipe(Effect.forkScoped)
        yield* Effect.sleep("1500 millis")
        assert.isUndefined(duplicate.pollUnsafe())
      }).pipe(TestClock.withLive), { timeout: 20000 })

    // it.layer shares its TestClock across concurrent tests. Each paused worker
    // needs a private clock so another test cannot renew its lease before recovery.
    it.effect("renews an expired lease before recovery revokes ownership", () =>
      Effect.gen(function*() {
        const queue = yield* makeOwnershipQueue("effectq-late-renewal:", "100 millis")
        // Stagger the timers: renewal is due at 100ms, reset at 150ms.
        yield* TestClock.adjust("50 millis")
        yield* queue.offer({ n: 42 }, { id: "order-1" })
        const taken = Latch.makeUnsafe()
        const finish = Latch.makeUnsafe()
        const claim = yield* queue.take(() => taken.open.pipe(Effect.andThen(finish.await))).pipe(Effect.forkScoped)
        yield* taken.await
        yield* Effect.sleep("1100 millis").pipe(TestClock.withLive)
        // Only renewal runs, after Redis has expired the lease. Give its I/O
        // time to complete before introducing a recovery worker.
        yield* TestClock.adjust("50 millis")
        yield* Effect.sleep("100 millis").pipe(TestClock.withLive)
        const recovery = yield* makeOwnershipQueue("effectq-late-renewal:", "100 millis").pipe(TestClock.withLive)
        const duplicate = yield* recovery.take((_value, metadata) => Effect.succeed(metadata)).pipe(
          TestClock.withLive,
          Effect.forkScoped
        )
        yield* Effect.sleep("400 millis").pipe(TestClock.withLive)
        assert.isUndefined(duplicate.pollUnsafe())
        yield* finish.open
        yield* Fiber.join(claim)
        yield* Effect.sleep("1500 millis").pipe(TestClock.withLive)
        assert.isUndefined(duplicate.pollUnsafe())
      }).pipe(Effect.provide(TestClock.layer())), { timeout: 20000 })

    it.effect("revoked ownership cannot settle recovered work before reacquisition", () =>
      Effect.gen(function*() {
        const prefix = "effectq-revoked-owner:"
        const queue = yield* makeOwnershipQueue(prefix, "100 millis")
        const recovery = yield* makeOwnershipQueue(prefix, "100 millis").pipe(TestClock.withLive)
        // Start recovery's reset loop, then leave it idle: no replacement may
        // acquire until after the old owner has resumed renewal and settled.
        yield* recovery.offer({ n: 0 }, { id: "initialize-recovery" })
        yield* recovery.take(Effect.succeed).pipe(TestClock.withLive)
        yield* queue.offer({ n: 42 }, { id: "order-1" })
        const taken = Latch.makeUnsafe()
        const finish = Latch.makeUnsafe()
        const stale = yield* queue.take(() => taken.open.pipe(Effect.andThen(finish.await))).pipe(Effect.forkScoped)
        yield* taken.await
        yield* Effect.sleep("1500 millis").pipe(TestClock.withLive)
        yield* TestClock.adjust("100 millis")
        yield* Effect.sleep("100 millis").pipe(TestClock.withLive)
        yield* finish.open
        yield* Fiber.join(stale)
        const recovered = yield* recovery.take((value, metadata) => Effect.succeed({ value, ...metadata })).pipe(
          TestClock.withLive
        )
        assert.deepStrictEqual(recovered, { value: { n: 42 }, id: "order-1", attempts: 2 })
        const duplicate = yield* recovery.take(Effect.succeed).pipe(TestClock.withLive, Effect.forkScoped)
        yield* Effect.sleep("1500 millis").pipe(TestClock.withLive)
        assert.isUndefined(duplicate.pollUnsafe())
      }).pipe(Effect.provide(TestClock.layer())), { timeout: 20000 })

    for (const settlement of ["failure", "interruption", "success", "dead-letter"] as const) {
      it.effect(`stale-owner ${settlement} does not release a live claim`, () =>
        Effect.gen(function*() {
          const makeQueue = Effect.fnUntraced(function*(lockRefreshInterval: Duration.Input) {
            const store = yield* PersistedQueue.makeStoreRedis({
              prefix: `effectq-stale-${settlement}:`,
              pollInterval: "50 millis",
              lockExpiration: "1 second",
              lockRefreshInterval
            })
            const factory = yield* PersistedQueue.makeFactory.pipe(
              Effect.provideService(PersistedQueue.PersistedQueueStore, store)
            )
            return yield* factory.make({
              name: "ownership",
              schema: RedisItem,
              maxAttempts: settlement === "dead-letter" && lockRefreshInterval === "1 hour" ? 1 : undefined,
              retrySchedule: Schedule.spaced(0)
            })
          })
          const a = yield* makeQueue("1 hour")
          const b = yield* makeQueue("100 millis")
          const c = yield* makeQueue("100 millis")
          yield* a.offer({ n: 42 }, { id: "order-1" })

          const aTaken = Latch.makeUnsafe()
          const releaseA = Latch.makeUnsafe()
          const stale = yield* a.take(() =>
            Effect.gen(function*() {
              yield* aTaken.open
              yield* releaseA.await
              if (settlement === "success") return
              return yield* Effect.fail("stale failure")
            })
          ).pipe(Effect.forkScoped)
          yield* aTaken.await

          const bTaken = Latch.makeUnsafe()
          const replacement = yield* b.take((_value, { attempts }) =>
            Effect.gen(function*() {
              assert.strictEqual(attempts, 2)
              yield* bTaken.open
              return yield* Effect.never
            })
          ).pipe(Effect.forkScoped)
          // Redis owns the expiry clock. Wait for B to actually reclaim A's
          // expired lease before allowing the stale finalizer to run.
          yield* bTaken.await

          if (settlement === "success") {
            yield* releaseA.open
            yield* Fiber.join(stale)
          } else if (settlement !== "interruption") {
            yield* releaseA.open
            assert.strictEqual(yield* Fiber.join(stale).pipe(Effect.flip), "stale failure")
          } else {
            yield* Fiber.interrupt(stale)
          }

          const duplicate = yield* c.take((_value, metadata) => Effect.succeed(metadata)).pipe(Effect.forkScoped)
          // Longer than a lease: B must keep its claim while C polls and resets.
          yield* Effect.sleep("1500 millis")
          assert.isUndefined(duplicate.pollUnsafe())
          // Requeue the replacement: a stale success must not silently delete
          // its pending/attempt state, and stale dead-lettering must not archive it.
          yield* Fiber.interrupt(replacement)
          assert.strictEqual((yield* Fiber.join(duplicate)).attempts, 2)
          const redis = yield* Redis.Redis
          assert.deepStrictEqual(
            yield* redis.send<Array<string>>("LRANGE", `effectq-stale-${settlement}:ownership:failed`, "0", "-1"),
            []
          )
        }).pipe(TestClock.withLive), { timeout: 20000 })
    }

    for (const suffix of ["ids", "failed"] as const) {
      it.effect(`cleanup ignores live custom ids ending in :${suffix}`, () =>
        Effect.gen(function*() {
          const store = yield* PersistedQueue.makeStoreRedis({
            prefix: `effectq-cleanup-${suffix}:`,
            pollInterval: "50 millis",
            lockExpiration: "1 second",
            lockRefreshInterval: "100 millis"
          })
          const factory = yield* PersistedQueue.makeFactory.pipe(
            Effect.provideService(PersistedQueue.PersistedQueueStore, store)
          )
          const retained = yield* factory.make({ name: "retained", schema: RedisItem, maxAttempts: 1 })
          yield* retained.offer({ n: 1 }, { id: "completed" })
          yield* retained.take(Effect.succeed)
          yield* retained.offer({ n: 2 }, { id: "failed" })
          yield* retained.take(() => Effect.fail("boom")).pipe(Effect.flip)

          const queue = yield* factory.make({ name: "orders", schema: RedisItem })
          yield* queue.offer({ n: 42 }, { id: `order-1:${suffix}` })
          const taken = Latch.makeUnsafe()
          const claim = yield* queue.take(() => taken.open.pipe(Effect.andThen(Effect.never))).pipe(Effect.forkScoped)
          yield* taken.await
          yield* Effect.sleep("200 millis")
          // Both cleanup passes must ignore string-valued locks, while still
          // pruning completed dedupe entries and expired dead-letter records.
          yield* store.cleanup({ timeToLive: Duration.millis(100), failedTimeToLive: Duration.millis(100) })
          yield* retained.offer({ n: 3 }, { id: "completed" })
          yield* retained.offer({ n: 4 }, { id: "failed" })
          assert.deepStrictEqual(yield* retained.take(Effect.succeed), { n: 3 })
          assert.deepStrictEqual(yield* retained.take(Effect.succeed), { n: 4 })
          const duplicate = yield* queue.take((value, metadata) => Effect.succeed({ value, ...metadata })).pipe(
            Effect.forkScoped
          )
          yield* Effect.sleep("1500 millis")
          assert.isUndefined(duplicate.pollUnsafe())
          yield* Fiber.interrupt(claim)
          const recovered = yield* Fiber.join(duplicate)
          assert.deepStrictEqual(recovered.value, { n: 42 })
          assert.strictEqual(recovered.attempts, 1)
        }).pipe(TestClock.withLive), { timeout: 20000 })
    }

    it.effect(
      "same-store stale success preserves the replacement and its refresh registration",
      () =>
        Effect.gen(function*() {
          const store = yield* PersistedQueue.makeStoreRedis({
            prefix: "effectq-same-store:",
            pollInterval: "50 millis",
            lockExpiration: "1 second",
            lockRefreshInterval: "100 millis"
          })
          const factory = yield* PersistedQueue.makeFactory.pipe(
            Effect.provideService(PersistedQueue.PersistedQueueStore, store)
          )
          const queue = yield* factory.make({ name: "ownership", schema: RedisItem })
          yield* queue.offer({ n: 42 }, { id: "order-1" })
          const aTaken = Latch.makeUnsafe()
          const releaseA = Latch.makeUnsafe()
          const stale = yield* queue.take(() => aTaken.open.pipe(Effect.andThen(releaseA.await))).pipe(
            Effect.forkScoped
          )
          yield* aTaken.await
          // An idle, live-clock worker recovers expired claims without taking
          // them. Keep this store's clock paused until its replacement acquires:
          // resuming reset and renewal together would permit valid late renewal.
          const recovery = yield* makeOwnershipQueue("effectq-same-store:", "100 millis").pipe(TestClock.withLive)
          yield* recovery.offer({ n: 0 }, { id: "initialize-recovery" })
          yield* recovery.take(Effect.succeed).pipe(TestClock.withLive)
          yield* Effect.sleep("1500 millis").pipe(TestClock.withLive)
          const bTaken = Latch.makeUnsafe()
          const replacement = yield* queue.take((_value, { attempts }) =>
            Effect.gen(function*() {
              assert.strictEqual(attempts, 2)
              yield* bTaken.open
              return yield* Effect.never
            })
          ).pipe(Effect.forkScoped)
          yield* bTaken.await
          // Only the replacement can now renew. Keep ticking while Redis I/O
          // completes, including while testing the old finalizer below.
          yield* Effect.sleep("100 millis").pipe(
            TestClock.withLive,
            Effect.andThen(TestClock.adjust("100 millis")),
            Effect.forever,
            Effect.forkScoped
          )
          yield* releaseA.open
          yield* Fiber.join(stale)
          const duplicate = yield* queue.take((_value, metadata) => Effect.succeed(metadata)).pipe(Effect.forkScoped)
          // The old finalizer must not unregister the new acquisition's refresh.
          yield* Effect.sleep("1500 millis").pipe(TestClock.withLive)
          assert.isUndefined(duplicate.pollUnsafe())
          yield* Fiber.interrupt(replacement)
          assert.strictEqual((yield* Fiber.join(duplicate)).attempts, 2)
        }).pipe(Effect.provide(TestClock.layer())),
      { timeout: 20000 }
    )

    it.effect("stale refresh cannot extend a replacement lease", () =>
      Effect.gen(function*() {
        const makeQueue = Effect.fnUntraced(function*(lockRefreshInterval: Duration.Input) {
          const store = yield* PersistedQueue.makeStoreRedis({
            prefix: "effectq-stale-refresh:",
            pollInterval: "50 millis",
            lockExpiration: "1 second",
            lockRefreshInterval
          })
          const factory = yield* PersistedQueue.makeFactory.pipe(
            Effect.provideService(PersistedQueue.PersistedQueueStore, store)
          )
          return yield* factory.make({ name: "ownership", schema: RedisItem })
        })
        // Only A's background refresh uses TestClock. Resume it after B takes
        // over. B's own refresh is disabled for the duration of the test.
        const a = yield* makeQueue("100 millis")
        const testClock = yield* Clock.Clock
        yield* Effect.gen(function*() {
          const b = yield* makeQueue("1 hour")
          const c = yield* makeQueue("100 millis")
          yield* a.offer({ n: 42 }, { id: "order-1" })
          const aTaken = Latch.makeUnsafe()
          yield* a.take(() => aTaken.open.pipe(Effect.andThen(Effect.never))).pipe(Effect.forkScoped)
          yield* aTaken.await
          yield* Effect.sleep("1100 millis")
          const bTaken = Latch.makeUnsafe()
          yield* b.take((_value, { attempts }) =>
            Effect.gen(function*() {
              assert.strictEqual(attempts, 2)
              yield* bTaken.open
              return yield* Effect.never
            })
          ).pipe(Effect.forkScoped)
          yield* bTaken.await
          const recovered = yield* c.take((_value, metadata) => Effect.succeed(metadata)).pipe(Effect.forkScoped)
          for (let i = 0; i < 20; i++) {
            yield* TestClock.adjust("100 millis").pipe(Effect.provideService(Clock.Clock, testClock))
            yield* Effect.sleep("100 millis")
          }
          assert.strictEqual((yield* Fiber.join(recovered)).attempts, 3)
        }).pipe(TestClock.withLive)
      }), { timeout: 20000 })

    it.effect("recovers elements from crashed workers", () =>
      Effect.gen(function*() {
        const prefix = "effectq-crash:"
        const store = yield* PersistedQueue.makeStoreRedis({
          prefix,
          pollInterval: "50 millis",
          lockRefreshInterval: "100 millis",
          lockExpiration: "1 second"
        })
        const factory = yield* PersistedQueue.makeFactory.pipe(
          Effect.provideService(PersistedQueue.PersistedQueueStore, store)
        )
        const queue = yield* factory.make({ name: "crash-recovery", schema: RedisItem })
        const redis = yield* Redis.Redis

        // simulate a worker that claimed the element and then crashed: the
        // element sits in the pending hash with a consumed attempt and no lock
        yield* redis.send(
          "HSET",
          `${prefix}crash-recovery:pending`,
          "crashed",
          JSON.stringify({ id: "crashed", element: { n: 1 } })
        )
        yield* redis.send("HSET", `${prefix}crash-recovery:attempts`, "crashed", "1")

        const result = yield* queue.take((value, metadata) => Effect.succeed([value.n, metadata.attempts]))
        assert.deepStrictEqual(result, [1, 2])
      }).pipe(TestClock.withLive), { timeout: 20000 })

    it.effect("dead-letters elements from workers that crashed on the final attempt", () =>
      Effect.gen(function*() {
        const prefix = "effectq-crash-exhausted:"
        const store = yield* PersistedQueue.makeStoreRedis({
          prefix,
          pollInterval: "50 millis",
          lockRefreshInterval: "100 millis",
          lockExpiration: "1 second"
        })
        const factory = yield* PersistedQueue.makeFactory.pipe(
          Effect.provideService(PersistedQueue.PersistedQueueStore, store)
        )
        const queue = yield* factory.make({ name: "crash-exhausted", schema: RedisItem, maxAttempts: 1 })
        const redis = yield* Redis.Redis

        // the final attempt was claimed by a worker that crashed, so no
        // finalizer will ever settle this element
        yield* redis.send(
          "HSET",
          `${prefix}crash-exhausted:pending`,
          "crashed",
          JSON.stringify({ id: "crashed", element: { n: 1 } })
        )
        yield* redis.send("HSET", `${prefix}crash-exhausted:attempts`, "crashed", "1")

        // an active taker runs the periodic reset that dead-letters such
        // elements instead of redelivering them
        const fiber = yield* queue.take(Effect.succeed).pipe(Effect.forkScoped)
        yield* Effect.sleep(1000)

        const failed = yield* redis.send<Array<string>>("LRANGE", `${prefix}crash-exhausted:failed`, "0", "-1")
        assert.strictEqual(failed.length, 1)
        const failedItem = JSON.parse(failed[0])
        assert.strictEqual(failedItem.id, "crashed")
        assert.deepStrictEqual(failedItem.element, { n: 1 })
        assert.strictEqual(failedItem.attempts, 1)
        assert.include(failedItem.lastFailure, "Lock expired after final attempt")

        const pending = yield* redis.send<number>("HLEN", `${prefix}crash-exhausted:pending`)
        assert.strictEqual(Number(pending), 0)
        assert.isUndefined(fiber.pollUnsafe())
      }).pipe(TestClock.withLive), { timeout: 20000 })
  }
)

const makeOwnershipQueue = Effect.fnUntraced(function*(prefix: string, lockRefreshInterval: Duration.Input) {
  const store = yield* PersistedQueue.makeStoreRedis({
    prefix,
    pollInterval: "50 millis",
    lockExpiration: "1 second",
    lockRefreshInterval
  })
  const factory = yield* PersistedQueue.makeFactory.pipe(
    Effect.provideService(PersistedQueue.PersistedQueueStore, store)
  )
  return yield* factory.make({ name: "ownership", schema: RedisItem })
})

const RedisItem = Schema.Struct({
  n: Schema.Number
})

const closedPort = Effect.promise(
  () =>
    new Promise<number>((resolve, reject) => {
      const server = createServer()
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        const address = server.address()
        if (address === null || typeof address === "string") {
          server.close()
          reject(new Error("Could not allocate a TCP port"))
          return
        }
        server.close((error) => {
          if (error) {
            reject(error)
          } else {
            resolve(address.port)
          }
        })
      })
    })
)
