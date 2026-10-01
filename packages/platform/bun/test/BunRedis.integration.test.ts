import * as BunRedis from "@effect/platform-bun/BunRedis"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Subscription from "@effect/redis/RedisSubscription"
import * as Transaction from "@effect/redis/RedisTransaction"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Queue, Result } from "effect"
import * as Redis from "effect/persistence/Redis"
import { startCluster, startRedis, startSentinel } from "../../../redis/test/utils/redis-server.ts"

const redis = Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) => Effect.promise(fixture.stop))

describe("BunRedis", () => {
  for (const protocol of [2, 3] as const) {
    it.live(`RESP${protocol}: runs binary commands, transactions, subscriptions and persistence`, () =>
      Effect.gen(function*() {
        const fixture = yield* redis
        const context = yield* Layer.build(BunRedis.layer({ socket: fixture, protocol }))
        const client = Context.get(context, BunRedis.BunRedis)
        assert.strictEqual(client, Context.get(context, Client.RedisClient))
        const key = new Uint8Array([0, 255, 13, 10, 128])
        const value = new Uint8Array([255, 0, 254, 13, 10])
        const results = yield* client.pipeline([Command.set(key, value), Command.getBytes(key)] as const)
        assert.strictEqual(Result.getOrThrow(results[0]), "OK")
        assert.deepStrictEqual(Result.getOrThrow(results[1]), value)
        const transaction = yield* Transaction.execute(
          client,
          [
            Command.set("transaction:key", "value"),
            Command.get("transaction:key")
          ] as const
        )
        assert.isNotNull(transaction)
        if (transaction === null) return assert.fail("Transaction unexpectedly conflicted")
        assert.deepStrictEqual(transaction.map(Result.getOrThrow), ["OK", "value"])
        const channel = new Uint8Array([0, 255, 128])
        const subscription = yield* Subscription.make(client, channel)
        assert.strictEqual(yield* client.run(Command.make(["PUBLISH", channel, value], Command.integer)), 1n)
        const message = yield* Queue.take(subscription.messages)
        assert.deepStrictEqual(message.channel, channel)
        assert.deepStrictEqual(message.message, value)
        yield* subscription.close
        const persistence = Context.get(context, Redis.Redis)
        assert.isFalse(persistence.cluster)
        yield* persistence.send("SET", "bun:persistence:key", "stored")
        assert.deepStrictEqual(yield* persistence.scan("bun:persistence:*"), ["bun:persistence:key"])
        const read = persistence.eval(
          Redis.script((key: string) => [key], {
            lua: "return redis.call('GET', KEYS[1])",
            numberOfKeys: 1
          }).withReturnType<string>()
        )
        assert.strictEqual(yield* read("bun:persistence:key"), "stored")
        yield* persistence.send("SCRIPT", "FLUSH")
        assert.strictEqual(yield* read("bun:persistence:key"), "stored")
        const messages = yield* persistence.subscribe("bun:persistence:pub")
        assert.strictEqual(yield* persistence.send("PUBLISH", "bun:persistence:pub", "message"), 1)
        assert.deepStrictEqual(yield* Queue.take(messages), { channel: "bun:persistence:pub", message: "message" })
      }))
  }

  it.live("provides Cluster clients and the slot-aware persistence adapter", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startCluster()), (fixture) =>
        Effect.promise(fixture.stop))
      const context = yield* Layer.build(BunRedis.layer({ topology: { _tag: "Cluster", seeds: fixture.seeds } }))
      const client = Context.get(context, BunRedis.BunRedis)
      assert.strictEqual(client, Context.get(context, Client.RedisClient))
      const results = yield* client.pipeline(
        [
          Command.set("{bun:first}:key", "first"),
          Command.set("{bun:second}:key", "second"),
          Command.get("{bun:first}:key"),
          Command.get("{bun:second}:key")
        ] as const
      )
      assert.deepStrictEqual(results.map(Result.getOrThrow), ["OK", "OK", "first", "second"])
      const persistence = Context.get(context, Redis.Redis)
      assert.isTrue(persistence.cluster)
      assert.deepStrictEqual(Array.from(yield* persistence.scan("{bun:*}:key")).sort(), [
        "{bun:first}:key",
        "{bun:second}:key"
      ])
    }), { timeout: 30_000 })

  it.live("acquires Sentinel topology through the native constructor", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startSentinel()), (fixture) =>
        Effect.promise(fixture.stop))
      const client = yield* BunRedis.make({
        topology: { _tag: "Sentinel", sentinels: fixture.sentinels, masterName: fixture.serviceName }
      })
      assert.strictEqual(yield* client.run(Command.set("sentinel:key", "value")), "OK")
      assert.strictEqual(yield* client.run(Command.get("sentinel:key")), "value")
      assert.strictEqual(client.config.topology?._tag, "Sentinel")
    }), { timeout: 30_000 })

  it.live("connects to Unix sockets through the native constructor", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis({ unixSocket: true })), (fixture) =>
        Effect.promise(fixture.stop))
      assert.isDefined(fixture.unixSocketPath)
      const client = yield* BunRedis.make({ socket: { path: fixture.unixSocketPath } })
      assert.strictEqual(yield* client.run(Command.set("unix:key", "value")), "OK")
      assert.strictEqual(yield* client.run(Command.get("unix:key")), "value")
    }))
})
