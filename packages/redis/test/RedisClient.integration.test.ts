import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Protocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Fiber, Layer, Result } from "effect"
import {
  acquire,
  type ClusterFixture,
  type SentinelFixture,
  startCluster,
  startRedis,
  startSentinel,
  waitUntil
} from "./utils/redis-server.ts"

const standalone = (options: Omit<Client.Config, "topology"> = {}) =>
  Effect.gen(function*() {
    const server = yield* acquire(() => startRedis())
    const client = yield* Client.make(makeConnector(), {
      ...options,
      topology: { _tag: "Standalone", endpoint: server }
    })
    return { server, client }
  })

const Cluster = Context.Service<ClusterFixture>("test/RedisCluster")
const Sentinel = Context.Service<SentinelFixture>("test/RedisSentinel")

describe("RedisClient", () => {
  describe("Standalone", () => {
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

    it.live("runs streams, Lua scripts and functions", () =>
      Effect.gen(function*() {
        const { client } = yield* standalone()
        yield* client.execute(["XADD", "stream", "1-0", "field", "value"])
        assert.deepStrictEqual(Protocol.toValue(yield* client.execute(["XREAD", "STREAMS", "stream", "0-0"])), [
          ["stream", [["1-0", ["field", "value"]]]]
        ])
        yield* client.run(Command.set("script-key", "script-value"))
        assert.strictEqual(
          Protocol.toValue(yield* client.execute(["EVAL", "return redis.call('GET',KEYS[1])", "1", "script-key"])),
          "script-value"
        )
        yield* client.execute([
          "FUNCTION",
          "LOAD",
          "#!lua name=fixture\nredis.register_function('echo', function(keys, args) return args[1] end)"
        ])
        assert.strictEqual(
          Protocol.toValue(yield* client.execute(["FCALL", "echo", "0", "value"], { keyIndexes: [] })),
          "value"
        )
      }))

    it.live("keeps pipeline results aligned across server errors", () =>
      Effect.gen(function*() {
        const { client } = yield* standalone()
        const [set, push, get] = yield* client.pipeline(
          [
            Command.set("pipeline", "value"),
            Command.make(["LPUSH", "pipeline", "wrong-type"], Command.integer),
            Command.get("pipeline")
          ] as const
        )
        assert.strictEqual(Result.getOrThrow(set), "OK")
        assert.isTrue(Result.isFailure(push) && push.failure.code === "WRONGTYPE")
        assert.strictEqual(Result.getOrThrow(get), "value")
      }))

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
  })

  it.layer(Layer.effect(Cluster, acquire(() => startCluster())), {
    excludeTestServices: true,
    timeout: "30 seconds"
  })("Cluster", (it) => {
    const makeClient = Effect.gen(function*() {
      const cluster = yield* Cluster
      return yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: cluster.seeds }, protocol: 3 })
    })

    it.effect("routes keys and pipelines to their slot owners", () =>
      Effect.gen(function*() {
        const client = yield* makeClient
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

    it.effect("follows MOVED after a slot migration and a replica promotion", () =>
      Effect.gen(function*() {
        const cluster = yield* Cluster
        const client = yield* makeClient
        const [source, target, replica] = [cluster.nodes[2], cluster.nodes[0], cluster.nodes[3]]
        yield* client.run(Command.set("{foo}:moved", "before"))

        yield* Effect.promise(() => cluster.moveSlot(12182, source, target))
        const moved = yield* client.pipeline([Command.set("{foo}:moved", "migrated"), Command.get("{foo}:moved")])
        assert.deepStrictEqual(moved.map(Result.getOrThrow), ["OK", "migrated"])

        yield* Effect.promise(() => cluster.failover(replica))
        assert.strictEqual(yield* client.run(Command.set("{foo}:moved", "promoted")), "OK")
        assert.strictEqual(yield* client.run(Command.get("{foo}:moved")), "promoted")
        yield* client.refresh
        assert.include((yield* client.nodes).map((node) => node.port), replica.port)
      }), 90_000)
  })

  it.layer(
    Layer.effect(
      Sentinel,
      acquire(() =>
        startSentinel({
          username: "data-user",
          password: "data-secret",
          sentinelUsername: "sentinel-user",
          sentinelPassword: "sentinel-secret"
        })
      )
    ),
    { excludeTestServices: true, timeout: "30 seconds" }
  )("Sentinel", (it) => {
    const makeClient = (sentinels: (fixture: SentinelFixture) => SentinelFixture["sentinels"]) =>
      Effect.gen(function*() {
        const fixture = yield* Sentinel
        return yield* Client.make(makeConnector({ connectTimeout: "500 millis" }), {
          username: "data-user",
          password: "data-secret",
          topology: {
            _tag: "Sentinel",
            sentinels: sentinels(fixture),
            masterName: fixture.serviceName,
            username: "sentinel-user",
            password: "sentinel-secret"
          }
        })
      })

    it.effect(
      "discovers the primary with separate Sentinel credentials and follows a failover",
      () =>
        Effect.gen(function*() {
          const fixture = yield* Sentinel
          const client = yield* makeClient((fixture) => fixture.sentinels)
          const old = yield* Effect.promise(fixture.primary)
          assert.strictEqual((yield* client.nodes)[0].port, old.port)
          yield* client.run(Command.set("key", "before"))

          const promoted = yield* Effect.promise(fixture.failover)
          const oldNode = fixture.dataNodes.find((node) => node.port === old.port)!
          yield* Effect.promise(() =>
            waitUntil(
              async () => (await oldNode.command("ROLE") as Array<unknown>)[0] === "slave",
              "Primary not demoted"
            )
          )
          // The stale connection gets READONLY, which is safe to retry after rediscovery.
          assert.strictEqual(yield* client.run(Command.set("key", "after")), "OK")
          assert.strictEqual(yield* client.run(Command.get("key")), "after")
          assert.strictEqual((yield* client.nodes)[0].port, promoted.port)
        }),
      90_000
    )

    it.effect("skips unavailable Sentinels and recovers after the primary process dies", () =>
      Effect.gen(function*() {
        const fixture = yield* Sentinel
        yield* Effect.promise(() => fixture.sentinels[2].stop())
        const client = yield* makeClient(({ sentinels }) => [sentinels[2], sentinels[0], sentinels[1]])
        yield* client.run(Command.set("surviving", "before"))

        yield* Effect.promise(fixture.killPrimary)
        const outcome = yield* client.run(Command.set("surviving", "after")).pipe(Effect.result)
        if (Result.isFailure(outcome)) {
          // A write in flight on the dead socket is not replayed.
          assert.include(["Connection", "Closed"], outcome.failure.reason)
          yield* client.run(Command.set("surviving", "after"))
        }
        assert.strictEqual(yield* client.run(Command.get("surviving")), "after")
      }), 90_000)
  })
})
