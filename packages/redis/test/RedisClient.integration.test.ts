import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Protocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Result } from "effect"
import { acquire, startCluster, startRedis, startSentinel, waitUntil } from "./utils/redis-server.ts"

const standalone = (options: Omit<Client.Config, "topology"> = {}) =>
  Effect.gen(function*() {
    const server = yield* acquire(() => startRedis())
    const client = yield* Client.make(makeConnector(), {
      ...options,
      topology: { _tag: "Standalone", endpoint: server }
    })
    return { server, client }
  })

describe("RedisClient", () => {
  for (const protocol of [2, 3] as const) {
    it.live(`RESP${protocol}: round-trips binary values, big integers and aggregates`, () =>
      Effect.gen(function*() {
        const { client } = yield* standalone({ protocol })
        const key = new Uint8Array([0, 255, 123, 13, 10])
        const value = new Uint8Array([255, 254, 0, 13, 10, 128])
        assert.strictEqual(yield* client.run(Command.set(key, value)), "OK")
        assert.deepStrictEqual(yield* client.run(Command.getBytes(key)), value)
        assert.strictEqual(yield* client.run(Command.get("missing")), null)

        yield* client.run(Command.set("counter", "9007199254740992"))
        assert.strictEqual(yield* client.run(Command.make(["INCR", "counter"], Command.integer)), 9007199254740993n)

        yield* client.execute(["HSET", "hash", "field", "value"])
        assert.deepStrictEqual(
          Protocol.toValue(yield* client.execute(["HGETALL", "hash"])),
          protocol === 2 ? ["field", "value"] : new Map([["field", "value"]])
        )
        yield* client.execute(["ZADD", "sorted", "1.5", "member"])
        assert.strictEqual(
          Protocol.toValue(yield* client.execute(["ZSCORE", "sorted", "member"])),
          protocol === 2 ? "1.5" : 1.5
        )
      }))
  }

  it.live("runs blocking commands on a reserved connection without stalling shared traffic", () =>
    Effect.gen(function*() {
      const { server, client } = yield* standalone()
      const session = yield* client.reserve()
      const blocked = yield* session.execute(["BLPOP", "queue", "0"]).pipe(Effect.forkScoped)
      yield* Effect.promise(() =>
        waitUntil(async () => String(await server.command("CLIENT", "LIST")).includes("cmd=blpop"), "BLPOP not sent")
      )
      assert.strictEqual(Protocol.toValue(yield* client.execute(["PING"])), "PONG")
      yield* client.execute(["RPUSH", "queue", "item"])
      assert.deepStrictEqual(Protocol.toValue(yield* Fiber.join(blocked)), ["queue", "item"])
    }))

  it.live("authenticates ACL users, selects the database and sets the client name", () =>
    Effect.gen(function*() {
      const server = yield* acquire(() => startRedis({ username: "user", password: "secret" }))
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: server },
        username: "user",
        password: "secret",
        database: 3,
        protocol: 3,
        clientName: "effect-acceptance"
      })
      yield* client.run(Command.set("selected", "value"))
      assert.strictEqual(yield* client.run(Command.get("selected")), "value")
      assert.strictEqual(yield* Effect.promise(() => server.command("GET", "selected")), null)
      const clients = String(yield* Effect.promise(() => server.command("CLIENT", "LIST")))
      assert.match(clients, /name=effect-acceptance .*db=3/)

      const error = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: server },
        password: "incorrect"
      }).pipe(Effect.flip)
      assert.strictEqual(error.code, "WRONGPASS")
    }))

  it.live("routes Cluster keys and pipelines to their slot owners", () =>
    Effect.gen(function*() {
      const cluster = yield* acquire(() => startCluster())
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Cluster", seeds: cluster.seeds },
        protocol: 3
      })
      assert.lengthOf(yield* client.nodes, 3)

      const binaryKey = new Uint8Array([0, ...new TextEncoder().encode("{bar}"), 255])
      const value = new Uint8Array([255, 0, 254])
      yield* client.run(Command.set(binaryKey, value))
      assert.deepStrictEqual(yield* client.run(Command.getBytes(binaryKey)), value)

      yield* client.run(Command.set("{foo}:a", "a"))
      yield* client.run(Command.set("{foo}:b", "b"))
      assert.deepStrictEqual(Protocol.toValue(yield* client.execute(["MGET", "{foo}:a", "{foo}:b"])), ["a", "b"])
      assert.strictEqual(
        Protocol.toValue(yield* client.execute(["EVAL", "return redis.call('GET',KEYS[1])", "1", "{foo}:a"])),
        "a"
      )

      const results = yield* client.pipeline(
        [
          Command.get("{foo}:a"),
          Command.set("{bar}:c", "c"),
          Command.get("{bar}:c"),
          Command.get("{baz}:missing")
        ] as const
      )
      assert.deepStrictEqual(results.map(Result.getOrThrow), ["a", "OK", "c", null])
    }), 90_000)

  it.live(
    "discovers the Sentinel primary with separate credentials and follows a failover",
    () =>
      Effect.gen(function*() {
        const fixture = yield* acquire(() =>
          startSentinel({
            username: "data-user",
            password: "data-secret",
            sentinelUsername: "sentinel-user",
            sentinelPassword: "sentinel-secret"
          })
        )
        const client = yield* Client.make(makeConnector(), {
          username: "data-user",
          password: "data-secret",
          topology: {
            _tag: "Sentinel",
            sentinels: fixture.sentinels,
            masterName: fixture.serviceName,
            username: "sentinel-user",
            password: "sentinel-secret"
          }
        })
        const old = yield* Effect.promise(fixture.primary)
        assert.strictEqual((yield* client.nodes)[0].port, old.port)
        yield* client.run(Command.set("key", "before"))

        const promoted = yield* Effect.promise(fixture.failover)
        const oldNode = fixture.dataNodes.find((node) => node.port === old.port)!
        yield* Effect.promise(() =>
          waitUntil(async () => (await oldNode.command("ROLE") as Array<unknown>)[0] === "slave", "Primary not demoted")
        )
        // The stale connection gets READONLY, which is safe to retry after rediscovery.
        assert.strictEqual(yield* client.run(Command.set("key", "after")), "OK")
        assert.strictEqual(yield* client.run(Command.get("key")), "after")
        assert.strictEqual((yield* client.nodes)[0].port, promoted.port)
      }),
    90_000
  )
})
