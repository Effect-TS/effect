import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Transaction from "@effect/redis/RedisTransaction"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Result } from "effect"
import { acquire, startRedis } from "./utils/redis-server.ts"

const ClientLive = Layer.effect(
  Client.RedisClient,
  Effect.gen(function*() {
    const server = yield* acquire(() => startRedis())
    return yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: server } })
  })
)

it.layer(ClientLive, { excludeTestServices: true })("RedisTransaction", (it) => {
  it.effect("returns EXEC replies in position, including command errors", () =>
    Effect.gen(function*() {
      const client = yield* Client.RedisClient
      const results = yield* Transaction.execute(
        client,
        [
          Command.set("exec:string", "value"),
          Command.make(["LPUSH", "exec:string", "wrong-type"], Command.integer),
          Command.get("exec:string")
        ] as const
      )
      if (results === null) return assert.fail("Transaction unexpectedly conflicted")
      const [set, push, get] = results
      assert.strictEqual(Result.getOrThrow(set), "OK")
      assert.isTrue(Result.isFailure(push) && push.failure.code === "WRONGTYPE")
      assert.strictEqual(Result.getOrThrow(get), "value")
    }))

  it.effect("returns null without applying commands when a watched key changes", () =>
    Effect.gen(function*() {
      const client = yield* Client.RedisClient
      yield* client.run(Command.set("watch:key", "before"))
      const result = yield* Transaction.execute(
        client,
        [Command.set("watch:key", "transaction"), Command.set("watch:other", "queued")] as const,
        {
          watch: (connection) =>
            Effect.gen(function*() {
              yield* connection.execute(["WATCH", "watch:key"])
              yield* client.run(Command.set("watch:key", "concurrent"))
            })
        }
      )
      assert.isNull(result)
      assert.strictEqual(yield* client.run(Command.get("watch:key")), "concurrent")
      assert.strictEqual(yield* client.run(Command.get("watch:other")), null)
    }))

  it.effect("fails with the queue-time error without applying commands", () =>
    Effect.gen(function*() {
      const client = yield* Client.RedisClient
      const error = yield* Transaction.execute(
        client,
        [
          Command.set("queued:key", "value"),
          Command.make(["SET", "queued:invalid"], Command.text)
        ] as const
      ).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Server")
      assert.strictEqual(error.code, "ERR")
      assert.strictEqual(yield* client.run(Command.get("queued:key")), null)
      assert.strictEqual(yield* client.run(Command.set("queued:after", "value")), "OK")
    }))
})
