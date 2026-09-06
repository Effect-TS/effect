import { NodeRedis } from "@effect/platform-node"
import { assert, it } from "@effect/vitest"
import { RedisContainer } from "@testcontainers/redis"
import { Duration, Effect, Layer, Queue, Schema } from "effect"
import * as PersistedCacheTest from "effect-test/unstable/persistence/PersistedCacheTest"
import * as PersistedQueueTest from "effect-test/unstable/persistence/PersistedQueueTest"
import { TestClock } from "effect/testing"
import { PersistedQueue, Persistence, RateLimiter, Redis } from "effect/unstable/persistence"
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

it.layer(RedisLayer, { timeout: "30 seconds" })("RateLimiter (NodeRedis)", (it) => {
  // Tests run concurrently, so each body provides its own clock instead of
  // advancing the TestClock shared by it.layer.
  it.effect.each(
    [
      {
        name: "rejected attempts and exact refill boundaries",
        limit: 5,
        windowMillis: 300_000,
        steps: [
          [0, 5, false, 0, 0, 300_000],
          [0, 1, false, -1, 60_000, 300_000],
          [59_000, 1, false, -1, 1_000, 241_000],
          [0, 1, false, -1, 1_000, 241_000],
          [1_000, 1, false, 0, 0, 300_000],
          [0, 1, false, -1, 60_000, 300_000]
        ]
      },
      {
        name: "rejected batches preserve refilled tokens",
        limit: 5,
        windowMillis: 300_000,
        steps: [
          [0, 5, false, 0, 0, 300_000],
          [59_000, 3, false, -3, 121_000, 241_000],
          [1_000, 3, false, -2, 120_000, 240_000],
          [120_000, 3, false, 0, 0, 300_000]
        ]
      },
      {
        name: "delay reservations and existing debt",
        limit: 5,
        windowMillis: 300_000,
        steps: [
          [0, 5, false, 0, 0, 300_000],
          [59_000, 1, true, -1, 1_000, 301_000],
          [0, 2, true, -3, 121_000, 421_000],
          [0, 1, false, -4, 181_000, 421_000],
          [0, 1, false, -4, 181_000, 421_000],
          [61_000, 1, false, -2, 120_000, 360_000],
          [120_000, 1, false, 0, 0, 300_000]
        ]
      },
      {
        name: "fractional intervals with multiple tokens",
        limit: 3,
        windowMillis: 1_000,
        steps: [
          [0, 3, false, 0, 0, 1_000],
          [1, 2, false, -2, 666, 999],
          [0, 3, false, -3, 999, 999],
          [666, 2, false, 0, 0, 1_000],
          [332, 1, false, -1, 1, 668],
          [0, 1, true, -1, 1, 1_001],
          [1, 1, false, -1, 334, 1_000]
        ]
      }
    ] as const
  )("matches memory: $name", (test) =>
    Effect.gen(function*() {
      const memory = yield* RateLimiter.RateLimiterStore.pipe(Effect.provide(RateLimiter.layerStoreMemory))
      const redis = yield* RateLimiter.makeStoreRedis()
      for (const [elapsed, tokens, allowOverflow, remaining, retryAfter, resetAfter] of test.steps) {
        yield* TestClock.adjust(elapsed)
        const options = {
          key: test.name,
          tokens,
          limit: test.limit,
          window: Duration.millis(test.windowMillis),
          allowOverflow
        }
        const expected = [remaining, retryAfter, resetAfter] as const
        assert.deepStrictEqual(yield* memory.tokenBucket(options), expected)
        assert.deepStrictEqual(yield* redis.tokenBucket(options), expected)
      }
    }).pipe(Effect.provide(TestClock.layer())))

  it.effect("reserves distinct boundaries across concurrent Redis stores", () =>
    Effect.gen(function*() {
      const first = yield* RateLimiter.makeStoreRedis()
      const second = yield* RateLimiter.makeStoreRedis()
      const options = {
        key: "concurrent-token-bucket",
        tokens: 5,
        limit: 5,
        window: Duration.minutes(5),
        allowOverflow: true
      }
      yield* first.tokenBucket(options)
      yield* TestClock.adjust("59 seconds")
      const results = yield* Effect.all(
        [first, second, first].map((store) => store.tokenBucket({ ...options, tokens: 1 })),
        { concurrency: "unbounded" }
      )
      assert.deepStrictEqual(results.sort((a, b) => a[1] - b[1]), [
        [-1, 1_000, 301_000],
        [-2, 61_000, 361_000],
        [-3, 121_000, 421_000]
      ])
    }).pipe(Effect.provide(TestClock.layer())))

  it.effect.each([0, 1_700_000_000_000])(
    "preserves fractional refill boundaries at timestamp %s",
    (epoch) =>
      Effect.gen(function*() {
        const memory = yield* RateLimiter.RateLimiterStore.pipe(Effect.provide(RateLimiter.layerStoreMemory))
        const redis = yield* RateLimiter.makeStoreRedis()
        const limiters = yield* Effect.all(
          [memory, redis].map((store) =>
            RateLimiter.make.pipe(Effect.provideService(RateLimiter.RateLimiterStore, store))
          )
        )
        for (const limit of [3, 7, 11]) {
          yield* TestClock.setTime(epoch)
          const options = {
            algorithm: "token-bucket",
            key: `fractional-${epoch}-${limit}`,
            window: 1_000,
            limit
          } as const
          for (const limiter of limiters) {
            yield* limiter.consume({ ...options, tokens: limit })
            const error = yield* Effect.flip(limiter.consume({ ...options, tokens: limit }))
            assert.instanceOf(error.reason, RateLimiter.RateLimitExceeded)
            if (error.reason._tag === "RateLimitExceeded") {
              assert.strictEqual(Duration.toMillis(error.reason.retryAfter), 1_000)
            }
          }
          yield* TestClock.adjust(1_000)
          for (const limiter of limiters) {
            const result = yield* limiter.consume({ ...options, tokens: limit })
            assert.strictEqual(result.remaining, 0)
            assert.strictEqual(Duration.toMillis(result.resetAfter), 1_000)
          }
          for (let token = 1; token <= limit * 2; token++) {
            const boundary = 1_000 + Math.ceil(token * 1_000 / limit)
            yield* TestClock.setTime(epoch + boundary - 1)
            for (const limiter of limiters) {
              const error = yield* Effect.flip(limiter.consume(options))
              assert.instanceOf(error.reason, RateLimiter.RateLimitExceeded)
              if (error.reason._tag === "RateLimitExceeded") {
                assert.strictEqual(Duration.toMillis(error.reason.retryAfter), 1)
              }
            }
            yield* TestClock.adjust(1)
            for (const limiter of limiters) {
              assert.strictEqual((yield* limiter.consume(options)).remaining, 0)
            }
          }
        }
      }).pipe(Effect.provide(TestClock.layer()))
  )

  it.effect("accepts legacy refill timestamps and rebases after an older writer updates them", () =>
    Effect.gen(function*() {
      const store = yield* RateLimiter.makeStoreRedis()
      const redis = yield* Redis.Redis
      const key = "ratelimiter:legacy-refill"
      const options = {
        key: "legacy-refill",
        tokens: 1,
        limit: 5,
        window: Duration.minutes(5),
        allowOverflow: false
      }
      yield* redis.send("SET", key, "0", "PX", "300000")
      yield* redis.send("SET", `${key}:refill`, "0", "PX", "300000")
      yield* TestClock.adjust("59 seconds")
      assert.deepStrictEqual(yield* store.tokenBucket(options), [-1, 1_000, 241_000])

      yield* redis.send("SET", `${key}:refill`, "60000", "PX", "300000")
      yield* TestClock.adjust("60 seconds")
      assert.deepStrictEqual(yield* store.tokenBucket(options), [-1, 1_000, 241_000])
      yield* TestClock.adjust("1 second")
      assert.deepStrictEqual(yield* store.tokenBucket(options), [0, 0, 300_000])
    }).pipe(Effect.provide(TestClock.layer())))

  it.effect("preserves the last refill boundary when the configured rate changes", () =>
    Effect.gen(function*() {
      const memory = yield* RateLimiter.RateLimiterStore.pipe(Effect.provide(RateLimiter.layerStoreMemory))
      const redis = yield* RateLimiter.makeStoreRedis()
      const options = {
        key: "changing-refill-rate",
        tokens: 5,
        limit: 5,
        window: Duration.minutes(5),
        allowOverflow: false
      }
      for (const store of [memory, redis]) yield* store.tokenBucket(options)
      yield* TestClock.adjust("59 seconds")
      for (const store of [memory, redis]) {
        assert.deepStrictEqual(yield* store.tokenBucket({ ...options, tokens: 1, window: Duration.seconds(150) }), [
          0,
          0,
          121_000
        ])
      }
      yield* TestClock.adjust("1 second")
      for (const store of [memory, redis]) {
        assert.deepStrictEqual(yield* store.tokenBucket({ ...options, tokens: 1 }), [-1, 30_000, 270_000])
      }
      yield* TestClock.adjust("30 seconds")
      for (const store of [memory, redis]) {
        assert.deepStrictEqual(yield* store.tokenBucket({ ...options, tokens: 1 }), [0, 0, 300_000])
      }
    }).pipe(Effect.provide(TestClock.layer())))

  it.effect("does not add a lagging client's clock skew to retry or reset timing", () =>
    Effect.gen(function*() {
      const memory = yield* RateLimiter.RateLimiterStore.pipe(Effect.provide(RateLimiter.layerStoreMemory))
      const redis = yield* RateLimiter.makeStoreRedis()
      for (const elapsed of [0, 60_000]) {
        const options = {
          key: `backward-clock-${elapsed}`,
          tokens: 1,
          limit: 5,
          window: Duration.minutes(5),
          allowOverflow: false
        }
        yield* TestClock.setTime(120_000)
        for (const store of [memory, redis]) yield* store.tokenBucket({ ...options, tokens: 5 })
        if (elapsed > 0) {
          yield* TestClock.adjust(elapsed)
          for (const store of [memory, redis]) yield* store.tokenBucket(options)
        }
        yield* TestClock.setTime(115_000 + elapsed)
        for (const store of [memory, redis]) {
          assert.deepStrictEqual(yield* store.tokenBucket(options), [-1, 60_000, 300_000])
          assert.deepStrictEqual(yield* store.tokenBucket({ ...options, allowOverflow: true }), [-1, 60_000, 360_000])
          assert.deepStrictEqual(yield* store.tokenBucket(options), [-2, 120_000, 360_000])
        }
        yield* TestClock.setTime(240_000 + elapsed)
        for (const store of [memory, redis]) {
          assert.deepStrictEqual(yield* store.tokenBucket(options), [0, 0, 300_000])
        }
      }
    }).pipe(Effect.provide(TestClock.layer())))

  it.effect("keeps Redis expiration based on stored tokens and reservations", () =>
    Effect.gen(function*() {
      const store = yield* RateLimiter.makeStoreRedis()
      const redis = yield* Redis.Redis
      const options = {
        key: "token-bucket-expiration",
        tokens: 5,
        limit: 5,
        window: Duration.minutes(5),
        allowOverflow: false
      }
      yield* store.tokenBucket(options)
      yield* TestClock.adjust("59 seconds")
      assert.deepStrictEqual(yield* store.tokenBucket({ ...options, tokens: 1 }), [-1, 1_000, 241_000])
      for (
        const key of [
          "ratelimiter:token-bucket-expiration",
          "ratelimiter:token-bucket-expiration:refill",
          "ratelimiter:token-bucket-expiration:refill-state"
        ]
      ) {
        const ttl = yield* redis.send<number>("PTTL", key)
        assert.isTrue(ttl > 240_000 && ttl <= 300_000)
      }
      assert.deepStrictEqual(yield* store.tokenBucket({ ...options, tokens: 2, allowOverflow: true }), [
        -2,
        61_000,
        361_000
      ])
      for (
        const key of [
          "ratelimiter:token-bucket-expiration",
          "ratelimiter:token-bucket-expiration:refill",
          "ratelimiter:token-bucket-expiration:refill-state"
        ]
      ) {
        const ttl = yield* redis.send<number>("PTTL", key)
        assert.isTrue(ttl > 360_000 && ttl <= 420_000)
      }
    }).pipe(Effect.provide(TestClock.layer())))
})

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
