import { assert, describe, it } from "@effect/vitest"
import { Effect, Queue } from "effect"
import * as Client from "effect/redis/RedisClient"
import * as Subscription from "effect/redis/RedisSubscription"
import { makeConnector } from "./utils/redis-connector.ts"
import { acquire, startCluster, startRedis, waitUntil } from "./utils/redis-server.ts"

const text = (message: Subscription.Message) => new TextDecoder().decode(message.message)

describe("RedisSubscription", () => {
  for (const protocol of [2, 3] as const) {
    it.live(`RESP${protocol}: receives binary channel and pattern messages`, () =>
      Effect.gen(function*() {
        const server = yield* acquire(() => startRedis())
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Standalone", endpoint: server },
          protocol
        })
        const channel = new Uint8Array([255, 0, 254])
        const pattern = new Uint8Array([255, 42])
        const payload = new Uint8Array([0, 255, 13, 10])
        const direct = yield* Subscription.make(client, channel)
        const patterned = yield* Subscription.make(client, pattern, { mode: "pattern" })
        yield* client.execute(["PUBLISH", channel, payload])
        assert.deepStrictEqual(yield* Queue.take(direct.messages), { channel, message: payload, pattern: undefined })
        assert.deepStrictEqual(yield* Queue.take(patterned.messages), { channel, message: payload, pattern })
      }))
  }

  it.live("restores a sharded subscription after its Cluster slot migrates", () =>
    Effect.gen(function*() {
      const cluster = yield* acquire(() => startCluster())
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Cluster", seeds: cluster.seeds },
        protocol: 3,
        reconnectDelay: "1 millis"
      })
      const channel = "{foo}:channel"
      const subscription = yield* Subscription.make(client, channel, { mode: "sharded" })
      yield* client.execute(["SPUBLISH", channel, "before"])
      assert.strictEqual(text(yield* Queue.take(subscription.messages)), "before")

      const target = cluster.nodes[0]
      yield* Effect.promise(() => cluster.moveSlot(12182, cluster.nodes[2], target))
      yield* Effect.promise(() =>
        waitUntil(
          async () => (await target.command("PUBSUB", "SHARDNUMSUB", channel) as Array<unknown>)[1] === 1,
          "Sharded subscription did not move to the new slot owner"
        )
      )
      yield* client.execute(["SPUBLISH", channel, "after"])
      assert.strictEqual(text(yield* Queue.take(subscription.messages)), "after")
    }), 90_000)
})
