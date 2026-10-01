import * as BunRedis from "@effect/platform-bun/BunRedis"
import * as RedisCommand from "@effect/redis/RedisCommand"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Queue } from "effect"
import * as Redis from "effect/persistence/Redis"
import { startRedis } from "../../../redis/test/utils/redis-server.ts"

const redis = (options?: { readonly unixSocket?: boolean }) =>
  Effect.acquireRelease(Effect.promise(() => startRedis(options)), (fixture) => Effect.promise(fixture.stop))

describe("BunRedis", () => {
  it.live("runs commands, scripts and subscriptions against Redis", () =>
    Effect.gen(function*() {
      const fixture = yield* redis()
      const context = yield* Layer.build(BunRedis.layer({ socket: { host: fixture.host, port: fixture.port } }))
      const client = Context.get(context, BunRedis.BunRedis)
      assert.strictEqual(yield* client.run(RedisCommand.set("bun:key", "value")), "OK")

      const persistence = Context.get(context, Redis.Redis)
      const get = persistence.eval(
        Redis.script((key: string) => [key], {
          lua: "return redis.call('GET', KEYS[1])",
          numberOfKeys: 1
        }).withReturnType<string>()
      )
      assert.strictEqual(yield* get("bun:key"), "value")

      const messages = yield* persistence.subscribe("bun:channel")
      yield* persistence.send("PUBLISH", "bun:channel", "message")
      assert.deepStrictEqual(yield* Queue.take(messages), { channel: "bun:channel", message: "message" })
    }))

  it.live("connects through a Unix socket", () =>
    Effect.gen(function*() {
      const fixture = yield* redis({ unixSocket: true })
      const client = yield* BunRedis.make({ socket: { path: fixture.unixSocketPath } })
      assert.strictEqual(yield* client.run(RedisCommand.set("bun:unix", "value")), "OK")
      assert.strictEqual(yield* client.run(RedisCommand.get("bun:unix")), "value")
    }))
})
