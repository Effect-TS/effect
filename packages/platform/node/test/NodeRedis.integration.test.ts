import { NodeRedis } from "@effect/platform-node"
import { assert, it } from "@effect/vitest"
import { Clock, Duration, Effect, Latch, Layer, Queue, Schema } from "effect"
import * as PersistedCacheTest from "effect-test/persistence/PersistedCacheTest"
import * as PersistedQueueTest from "effect-test/persistence/PersistedQueueTest"
import * as RateLimiterTest from "effect-test/persistence/RateLimiterTest"
import { acquire, startCluster, startRedis } from "effect-test/redis/utils/redis-server"
import { PersistedQueue, Persistence, RateLimiter, Redis } from "effect/persistence"
import * as RedisCommand from "effect/redis/RedisCommand"
import { RedisError as NativeRedisError } from "effect/redis/RedisError"
import * as RedisProtocol from "effect/redis/RedisProtocol"
import { TestClock } from "effect/testing"
import { createServer } from "node:net"

const RedisLayer = Layer.unwrap(
  Effect.gen(function*() {
    const container = yield* Effect.acquireRelease(
      Effect.promise(() => startRedis()),
      (container) => Effect.promise(container.stop)
    )
    return NodeRedis.layer({
      socket: {
        host: container.host,
        port: container.port
      }
    })
  }).pipe(
    Effect.catchCause(() => Effect.fail(new PersistedCacheTest.TransientError()))
  )
)

const ClusterRedisLayer = Layer.unwrap(
  acquire(() => startCluster()).pipe(
    Effect.map((fixture) => NodeRedis.layer({ topology: { _tag: "Cluster", seeds: fixture.seeds } }))
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

    assert.instanceOf(error, NativeRedisError)
  }))

it.layer(PersistedQueueRedisLayer, { timeout: "30 seconds" })(
  "PersistedQueue (NodeRedis)",
  (it) => {
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

        const failed = RedisProtocol.toValue(
          yield* redis.execute(["LRANGE", `effectq:${queueName}:failed`, "0", "-1"])
        ) as Array<string>
        assert.strictEqual(failed.length, 1)
        const failedItem = JSON.parse(failed[0])
        assert.strictEqual(failedItem.id, id)
        assert.deepStrictEqual(failedItem.element, { n: 42 })
        assert.strictEqual(failedItem.attempts, 1)

        const pending = RedisProtocol.toValue(yield* redis.execute(["HLEN", `effectq:${queueName}:pending`]))
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

PersistedCacheTest.suite(
  "NodeRedis Cluster",
  Persistence.layerRedis.pipe(Layer.provide(ClusterRedisLayer))
)

PersistedQueueTest.suite(
  "NodeRedis Cluster",
  PersistedQueue.layerStoreRedis({
    pollInterval: "50 millis",
    lockRefreshInterval: "100 millis"
  }).pipe(Layer.provide(ClusterRedisLayer))
)

RateLimiterTest.suite(
  "NodeRedis Cluster",
  RateLimiter.layerStoreRedis().pipe(Layer.provide(ClusterRedisLayer))
)

it.layer(Persistence.layerBackingRedis.pipe(Layer.provideMerge(ClusterRedisLayer)), { timeout: "60 seconds" })(
  "Persistence (NodeRedis Cluster)",
  (it) => {
    it.effect("clears a namespace across primary nodes without removing another namespace", () =>
      Effect.gen(function*() {
        const backing = yield* Persistence.BackingPersistence
        const first = yield* backing.make("cluster:first{*?[]\\}")
        const second = yield* backing.make("cluster:second{*?[]\\}")
        yield* first.setMany([["a", { n: 1 }, undefined], ["b", { n: 2 }, undefined]])
        yield* second.set("a", { n: 3 }, undefined)
        assert.deepStrictEqual(yield* first.getMany(["a", "b"]), [{ n: 1 }, { n: 2 }])
        yield* first.clear
        assert.deepStrictEqual(yield* first.getMany(["a", "b"]), [undefined, undefined])
        assert.deepStrictEqual(yield* second.get("a"), { n: 3 })
      }))

    it.effect("cleans up only the queues under its own prefix", () =>
      Effect.gen(function*() {
        const redis = yield* Redis.Redis
        const failOne = Effect.fnUntraced(function*(prefix: string, name: string) {
          const store = yield* PersistedQueue.makeStoreRedis({ prefix, pollInterval: "50 millis" })
          const factory = yield* PersistedQueue.makeFactory.pipe(
            Effect.provideService(PersistedQueue.PersistedQueueStore, store)
          )
          const queue = yield* factory.make({ name, schema: RedisItem, maxAttempts: 1 })
          yield* queue.offer({ n: 1 })
          yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip)
          return store
        })
        const owner = yield* failOne("cleanup:", "jobs")
        // Another store whose queue name contains the first store's prefix.
        yield* failOne("other:", "cleanup:jobs")
        const failed = (key: string) => redis.send<number>("LLEN", `${Redis.key(redis, key)}:failed`)
        assert.strictEqual(Number(yield* failed("other:cleanup:jobs")), 1)

        yield* Effect.sleep("10 millis")
        yield* owner.cleanup({ timeToLive: Duration.zero, failedTimeToLive: Duration.zero })
        assert.strictEqual(Number(yield* failed("cleanup:jobs")), 0)
        assert.strictEqual(Number(yield* failed("other:cleanup:jobs")), 1)
      }).pipe(TestClock.withLive))

    it.effect("refreshes active locks independently for queues in different slots", () =>
      Effect.gen(function*() {
        const redis = yield* Redis.Redis
        const store = yield* PersistedQueue.makeStoreRedis({
          pollInterval: "50 millis",
          lockRefreshInterval: "100 millis",
          lockExpiration: "300 millis"
        })
        const factory = yield* PersistedQueue.makeFactory.pipe(
          Effect.provideService(PersistedQueue.PersistedQueueStore, store)
        )
        const names = ["cluster-lock-first", "cluster-lock-second"]
        const queues = yield* Effect.forEach(names, (name) => factory.make({ name, schema: RedisItem }))
        const taken = Latch.makeUnsafe()
        let count = 0
        for (const queue of queues) {
          yield* queue.offer({ n: 1 }, { id: "shared-lock-id" })
          yield* queue.take(() =>
            Effect.gen(function*() {
              if (++count === queues.length) yield* taken.open
              return yield* Effect.never
            })
          ).pipe(Effect.forkScoped)
        }
        yield* taken.await
        yield* Effect.sleep("750 millis")
        for (const name of names) {
          const lock = `${Redis.key(redis, `effectq:${name}`)}:shared-lock-id:lock`
          assert.isAbove(yield* redis.send<number>("PTTL", lock), 0)
        }
      }).pipe(TestClock.withLive))
  }
)

it.live("connects to Redis through TLS and a Unix socket", () =>
  Effect.gen(function*() {
    const fixture = yield* acquire(() => startRedis({ tls: true, unixSocket: true }))
    const tls = yield* NodeRedis.make({
      socket: { host: fixture.host, port: fixture.tlsPort!, tls: { rejectUnauthorized: false } }
    })
    const unix = yield* NodeRedis.make({ socket: { path: fixture.unixSocketPath! } })
    yield* tls.run(RedisCommand.set("transport-key", "secure-value"))
    assert.strictEqual(yield* unix.run(RedisCommand.get("transport-key")), "secure-value")
  }))
