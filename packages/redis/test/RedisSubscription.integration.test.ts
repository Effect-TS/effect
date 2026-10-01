import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Subscription from "@effect/redis/RedisSubscription"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Queue } from "effect"
import { startCluster, startRedis, waitUntil } from "./utils/redis-server.ts"

describe("Redis subscriptions", () => {
  for (const protocol of [2, 3] as const) {
    it.live(`RESP${protocol}: preserves binary channels, patterns and publications through reconnection`, () =>
      Effect.gen(function*() {
        const fixture = yield* Effect.acquireRelease(
          Effect.promise(() => startRedis()),
          (fixture) => Effect.promise(fixture.stop)
        )
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Standalone", endpoint: fixture },
          protocol,
          reconnectDelay: "1 millis"
        })
        const channel = new Uint8Array([255, 0, 254])
        const pattern = new Uint8Array([255, 42])
        const payload = new Uint8Array([0, 255, 254, 13, 10])
        const direct = yield* Subscription.make(client, channel)
        const patterned = yield* Subscription.make(client, pattern, { mode: "pattern" })
        yield* client.execute(["PUBLISH", channel, payload])
        assert.deepStrictEqual(yield* Queue.take(direct.messages), { channel, message: payload, pattern: undefined })
        assert.deepStrictEqual(yield* Queue.take(patterned.messages), { channel, message: payload, pattern })
        assert.strictEqual(
          yield* Effect.promise(() => fixture.command("CLIENT", "KILL", "TYPE", "PUBSUB")),
          2
        )
        yield* Effect.promise(() =>
          waitUntil(async () => {
            const subscriptionCount = await fixture.command("PUBSUB", "NUMPAT")
            // Binary channels cannot be inspected through the text administration
            // interface; both reconnecting sockets must be registered as Pub/Sub.
            const clients = String(await fixture.command("CLIENT", "LIST"))
            return subscriptionCount === 1 &&
              clients.split("\n").filter((line) => /flags=[^ ]*P/.test(line)).length === 2
          }, "Channel and pattern subscriptions were not restored")
        )
        yield* client.execute(["PUBLISH", channel, payload])
        assert.deepStrictEqual(yield* Queue.take(direct.messages), { channel, message: payload, pattern: undefined })
        assert.deepStrictEqual(yield* Queue.take(patterned.messages), { channel, message: payload, pattern })
        yield* direct.close
        yield* patterned.close
        assert.strictEqual(
          yield* Effect.promise(() => fixture.command("PUBSUB", "NUMPAT")),
          0
        )
      }))
  }

  it.live("fails overflow and releases the server's subscription", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) =>
        Effect.promise(fixture.stop))
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const subscription = yield* Subscription.make(client, "channel", { capacity: 1 })
      for (let index = 0; index < 32; index++) {
        yield* client.execute(["PUBLISH", "channel", String(index)])
      }
      yield* Effect.promise(() =>
        waitUntil(async () => {
          const counts = await fixture.command("PUBSUB", "NUMSUB", "channel") as Array<unknown>
          return counts[1] === 0
        }, "Overflowed subscription socket stayed registered")
      )
      const first = yield* Effect.result(Queue.take(subscription.messages))
      const terminal = first._tag === "Failure" ? first : yield* Effect.result(Queue.take(subscription.messages))
      assert.strictEqual(terminal._tag, "Failure")
      if (terminal._tag === "Failure") {
        assert.strictEqual(terminal.failure.reason, "Capacity")
      }
    }))

  it.live("restores a sharded subscription after its Cluster slot migrates", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startCluster()), (fixture) =>
        Effect.promise(fixture.stop))
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Cluster", seeds: fixture.seeds },
        protocol: 3,
        reconnectDelay: "1 millis"
      })
      const channel = "{foo}:channel"
      const subscription = yield* Subscription.make(client, channel, { mode: "sharded" })
      yield* client.execute(["SPUBLISH", channel, "before"])
      assert.strictEqual(new TextDecoder().decode((yield* Queue.take(subscription.messages)).message), "before")
      const source = fixture.nodes[2]
      const target = fixture.nodes[0]
      yield* Effect.promise(() =>
        fixture.moveSlot(12182, source, target)
      )
      yield* Effect.promise(() =>
        waitUntil(async () => {
          const counts = await target.command("PUBSUB", "SHARDNUMSUB", channel) as Array<unknown>
          return counts[1] === 1
        }, "Sharded subscription was not relocated to the slot owner")
      )
      yield* client.execute(["SPUBLISH", channel, "after"])
      assert.strictEqual(new TextDecoder().decode((yield* Queue.take(subscription.messages)).message), "after")
    }), 90_000)
})
