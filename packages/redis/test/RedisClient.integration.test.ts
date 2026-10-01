import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Protocol from "@effect/redis/RedisProtocol"
import * as Subscription from "@effect/redis/RedisSubscription"
import * as Transaction from "@effect/redis/RedisTransaction"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"
import * as Result from "effect/Result"
import { startCluster, startRedis, startSentinel, waitUntil } from "./utils/redis-server.ts"

describe("RedisClient", () => {
  describe("Standalone", () => {
    for (const protocol of [2, 3] as const) {
      it.live(`RESP${protocol}: preserves binary keys and values and integer precision`, () =>
        Effect.gen(function*() {
          const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) =>
            Effect.promise(fixture.stop))
          const client = yield* Client.make(makeConnector(), {
            topology: { _tag: "Standalone", endpoint: fixture },
            protocol
          })
          const key = new Uint8Array([0, 255, 123, 13, 10])
          const value = new Uint8Array([255, 254, 0, 13, 10, 128])
          assert.strictEqual(yield* client.run(Command.set(key, value)), "OK")
          assert.deepStrictEqual(yield* client.run(Command.getBytes(key)), value)
          assert.strictEqual(yield* client.run(Command.get("missing")), null)
          yield* client.run(Command.set("large-counter", "9007199254740992"))
          const integer = yield* client.run(Command.make(["INCR", "large-counter"], Command.integer))
          assert.strictEqual(integer, 9007199254740993n)
          assert.strictEqual(Protocol.toValue(yield* client.execute(["PING"])), "PONG")
        }))

      it.live(`RESP${protocol}: runs hashes, lists, sets and sorted sets`, () =>
        Effect.gen(function*() {
          const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) =>
            Effect.promise(fixture.stop))
          const client = yield* Client.make(makeConnector(), {
            topology: { _tag: "Standalone", endpoint: fixture },
            protocol
          })
          yield* client.execute(["HSET", "hash", "field", "value"])
          assert.strictEqual(Protocol.toValue(yield* client.execute(["HGET", "hash", "field"])), "value")
          const hash = Protocol.toValue(yield* client.execute(["HGETALL", "hash"]))
          assert.deepStrictEqual(hash, protocol === 2 ? ["field", "value"] : new Map([["field", "value"]]))
          yield* client.execute(["RPUSH", "list", "first", "second"])
          assert.deepStrictEqual(Protocol.toValue(yield* client.execute(["LRANGE", "list", "0", "-1"])), [
            "first",
            "second"
          ])
          yield* client.execute(["SADD", "set", "member"])
          const set = Protocol.toValue(yield* client.execute(["SMEMBERS", "set"]))
          assert.deepStrictEqual(set, protocol === 2 ? ["member"] : new Set(["member"]))
          yield* client.execute(["ZADD", "sorted", "1.5", "first", "2", "second"])
          assert.deepStrictEqual(Protocol.toValue(yield* client.execute(["ZRANGE", "sorted", "0", "-1"])), [
            "first",
            "second"
          ])
          assert.strictEqual(
            Protocol.toValue(yield* client.execute(["ZSCORE", "sorted", "first"])),
            protocol === 2 ? "1.5" : 1.5
          )
        }))
    }

    it.live("executes Streams, Lua and functions through the generic command interface", () =>
      Effect.gen(function*() {
        const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) =>
          Effect.promise(fixture.stop))
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Standalone", endpoint: fixture },
          protocol: 2
        })
        yield* client.execute(["XADD", "stream", "1-0", "field", "value"])
        assert.deepStrictEqual(Protocol.toValue(yield* client.execute(["XREAD", "STREAMS", "stream", "0-0"])), [
          ["stream", [["1-0", ["field", "value"]]]]
        ])
        assert.strictEqual(
          Protocol.toValue(yield* client.execute(["EVAL", "return redis.call('GET',KEYS[1])", "1", "script-key"])),
          null
        )
        yield* client.execute(["SET", "script-key", "script-value"])
        assert.strictEqual(
          Protocol.toValue(yield* client.execute(["EVAL", "return redis.call('GET',KEYS[1])", "1", "script-key"])),
          "script-value"
        )
        yield* client.execute([
          "FUNCTION",
          "LOAD",
          "#!lua name=effect_fixture\nredis.register_function('fixture_echo', function(keys, args) return args[1] end)"
        ])
        assert.strictEqual(
          Protocol.toValue(yield* client.execute(["FCALL", "fixture_echo", "0", "function-value"], { keyIndexes: [] })),
          "function-value"
        )
      }))

    it.live("keeps pipeline results aligned across server errors", () =>
      Effect.gen(function*() {
        const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) =>
          Effect.promise(fixture.stop))
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
        const results = yield* client.pipeline(
          [
            Command.set("pipeline", "value"),
            Command.make(["LPUSH", "pipeline", "wrong-type"], Command.integer),
            Command.get("pipeline")
          ] as const
        )
        assert.strictEqual(Result.getOrThrow(results[0]), "OK")
        assert.strictEqual(results[1]._tag, "Failure")
        if (results[1]._tag === "Failure") {
          assert.strictEqual(results[1].failure.code, "WRONGTYPE")
        }
        assert.strictEqual(Result.getOrThrow(results[2]), "value")
      }))

    it.live("owns WATCH and transactions on one dedicated session", () =>
      Effect.gen(function*() {
        const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) =>
          Effect.promise(fixture.stop))
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
        yield* client.run(Command.set("watched", "before"))
        const session = yield* client.reserve()
        yield* session.execute(["WATCH", "watched"])
        yield* client.run(Command.set("watched", "concurrent-write"))
        yield* session.execute(["MULTI"])
        assert.strictEqual(Protocol.toValue(yield* session.execute(["SET", "watched", "transaction-write"])), "QUEUED")
        assert.strictEqual(Protocol.toValue(yield* session.execute(["EXEC"])), null)
        assert.strictEqual(yield* client.run(Command.get("watched")), "concurrent-write")
        yield* session.execute(["MULTI"])
        yield* session.execute(["SET", "watched", "committed"])
        yield* session.execute(["INCR", "transaction-counter"])
        assert.deepStrictEqual(Protocol.toValue(yield* session.execute(["EXEC"])), ["OK", 1])
        const rejected = yield* client.execute(["MULTI"]).pipe(Effect.flip)
        assert.strictEqual(rejected.reason, "Routing")
        assert.strictEqual(rejected.outcome, "NotSent")
      }))

    it.live("isolates blocking commands from shared traffic and releases their sockets", () =>
      Effect.gen(function*() {
        const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) =>
          Effect.promise(fixture.stop))
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
        const session = yield* client.reserve()
        const blocked = yield* session.execute(["BLPOP", "blocking", "0"]).pipe(Effect.forkScoped)
        yield* Effect.promise(() =>
          waitUntil(async () =>
            String(await fixture.command("CLIENT", "LIST")).includes("cmd=blpop"), "Blocking command was not submitted")
        )
        assert.strictEqual(Protocol.toValue(yield* client.execute(["PING"])), "PONG")
        yield* client.execute(["RPUSH", "blocking", "released"])
        assert.deepStrictEqual(Protocol.toValue(yield* Fiber.join(blocked)), ["blocking", "released"])
        yield* session.close
        assert.isFalse(session.isOpen())
      }))

    it.live("authenticates ACL users, selects databases and sets connection names", () =>
      Effect.gen(function*() {
        const fixture = yield* Effect.acquireRelease(
          Effect.promise(() => startRedis({ username: "fixture-user", password: "fixture-secret" })),
          (fixture) => Effect.promise(fixture.stop)
        )
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Standalone", endpoint: fixture },
          username: "fixture-user",
          password: "fixture-secret",
          database: 3,
          protocol: 3,
          clientName: "effect-native-redis-acceptance"
        })
        yield* client.run(Command.set("selected-database", "value"))
        assert.strictEqual(yield* client.run(Command.get("selected-database")), "value")
        // Administration commands use a separate default-database connection.
        assert.strictEqual(yield* Effect.promise(() => fixture.command("GET", "selected-database")), null)
        const clients = String(yield* Effect.promise(() => fixture.command("CLIENT", "LIST")))
        assert.include(clients, "name=effect-native-redis-acceptance")
        assert.include(clients, "db=3")
        const unauthorized = yield* Client.make(makeConnector(), {
          topology: { _tag: "Standalone", endpoint: fixture },
          password: "incorrect"
        }).pipe(Effect.flip)
        assert.strictEqual(unauthorized.code, "WRONGPASS")
      }))

    it.live("closes shared, blocked and subscribed sessions before server fixture cleanup", () =>
      Effect.gen(function*() {
        const fixture = yield* Effect.acquireRelease(
          Effect.promise(() => startRedis()),
          (fixture) => Effect.promise(fixture.stop)
        )
        yield* Effect.scoped(Effect.gen(function*() {
          const client = yield* Client.make(makeConnector(), {
            topology: { _tag: "Standalone", endpoint: fixture },
            clientName: "scope-cleanup"
          })
          const session = yield* client.reserve()
          yield* session.execute(["BLPOP", "blocked-at-shutdown", "0"]).pipe(Effect.forkScoped)
          yield* Subscription.make(client, "closed-at-shutdown")
          yield* Effect.promise(() =>
            waitUntil(
              async () => String(await fixture.command("CLIENT", "LIST")).includes("cmd=blpop"),
              "Blocked session did not start"
            )
          )
        }))
        const clients = String(
          yield* Effect.promise(() => fixture.command("CLIENT", "LIST"))
        )
        assert.notInclude(clients, "name=scope-cleanup")
        assert.deepStrictEqual(
          yield* Effect.promise(() => fixture.command("PUBSUB", "NUMSUB", "closed-at-shutdown")),
          ["closed-at-shutdown", 0]
        )
      }))
  })

  describe("Cluster", () => {
    it.live(
      "routes binary and dynamic keys, validates slots and reserves same-slot transactions",
      () =>
        Effect.gen(function*() {
          const fixture = yield* Effect.acquireRelease(
            Effect.promise(() => startCluster({ username: "cluster-user", password: "cluster-secret" })),
            (fixture) => Effect.promise(fixture.stop)
          )
          const client = yield* Client.make(makeConnector(), {
            topology: { _tag: "Cluster", seeds: fixture.seeds },
            username: "cluster-user",
            password: "cluster-secret",
            protocol: 3
          })
          assert.lengthOf(yield* client.nodes, 3)
          const binary = new Uint8Array([0, 123, 102, 111, 111, 125, 255])
          const value = new Uint8Array([255, 0, 254])
          yield* client.run(Command.set(binary, value))
          assert.deepStrictEqual(yield* client.run(Command.getBytes(binary)), value)
          yield* client.run(Command.set("{foo}:first", "first"))
          yield* client.run(Command.set("{foo}:second", "second"))
          assert.deepStrictEqual(Protocol.toValue(yield* client.execute(["MGET", "{foo}:first", "{foo}:second"])), [
            "first",
            "second"
          ])
          const crossSlot = yield* client.execute(["MGET", "{foo}:first", "{bar}:second"]).pipe(Effect.flip)
          assert.strictEqual(crossSlot.code, "CROSSSLOT")
          assert.strictEqual(crossSlot.outcome, "NotSent")
          assert.strictEqual(
            Protocol.toValue(yield* client.execute(["EVAL", "return redis.call('GET',KEYS[1])", "1", "{foo}:first"])),
            "first"
          )
          yield* client.execute(["XADD", "{foo}:stream", "1-0", "field", "value"])
          const stream = yield* client.execute(["XREAD", "STREAMS", "{foo}:stream", "0-0"])
          assert.strictEqual(stream._tag, "Map")
          const custom = yield* client.execute(["OBJECT", "ENCODING", "{foo}:first"], { keyIndexes: [2] })
          assert.strictEqual(Protocol.toValue(custom), "embstr")
          const session = yield* client.reserve({ key: "{foo}:first" })
          yield* session.execute(["MULTI"])
          yield* session.execute(["SET", "{foo}:first", "transaction"])
          yield* session.execute(["GET", "{foo}:second"])
          assert.deepStrictEqual(Protocol.toValue(yield* session.execute(["EXEC"])), ["OK", "second"])
          const wrongAffinity = yield* session.execute(["GET", "{bar}:key"]).pipe(Effect.flip)
          assert.strictEqual(wrongAffinity.code, "CROSSSLOT")
          const pipeline = yield* client.pipeline(
            [Command.get("{foo}:first"), Command.set("{bar}:key", "other-slot"), Command.get("{bar}:key")] as const
          )
          assert.strictEqual(Result.getOrThrow(pipeline[0]), "transaction")
          assert.strictEqual(Result.getOrThrow(pipeline[1]), "OK")
          assert.strictEqual(Result.getOrThrow(pipeline[2]), "other-slot")
          const increments = yield* client.pipeline(Array.from({ length: 128 }, (_, index) =>
            Command.make(
              ["INCR", index % 2 === 0 ? "{foo}:pipeline-counter" : "{bar}:pipeline-counter"],
              Command.integer
            )))
          for (let index = 0; index < increments.length; index++) {
            assert.strictEqual(Result.getOrThrow(increments[index]), BigInt(Math.floor(index / 2) + 1))
          }
          const scan = Protocol.toValue(
            yield* client.execute(["SCAN", "0"], { node: fixture.nodes[2], keyIndexes: [] })
          ) as [string, Array<string>]
          assert.include(scan[1], "{foo}:first")
        }),
      90_000
    )

    it.live(
      "follows real ASK and MOVED redirects during slot migration then replica promotion",
      () =>
        Effect.gen(function*() {
          const fixture = yield* Effect.acquireRelease(
            Effect.promise(() => startCluster()),
            (fixture) => Effect.promise(fixture.stop)
          )
          const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: fixture.seeds } })
          const source = fixture.nodes[2]
          const target = fixture.nodes[0]
          const key = "{foo}:migration"
          yield* client.run(Command.set(key, "preserved"))
          yield* Effect.promise(async () => {
            await target.command("CLUSTER", "SETSLOT", "12182", "IMPORTING", source.id)
            await source.command("CLUSTER", "SETSLOT", "12182", "MIGRATING", target.id)
            await source.command("MIGRATE", target.host, String(target.port), key, "0", "5000")
          })
          // The slot map still points at the source. Its missing key produces ASK.
          assert.strictEqual(yield* client.run(Command.get(key)), "preserved")
          const asked = yield* client.pipeline([Command.set(key, "asked"), Command.get(key), Command.get(key)])
          assert.deepStrictEqual(asked.map(Result.getOrThrow), ["OK", "asked", "asked"])
          // Finalizing ownership produces MOVED from that same cached source.
          yield* Effect.promise(() => fixture.moveSlot(12182, source, target))
          const moved = yield* client.pipeline([Command.set(key, "moved"), Command.get(key), Command.get(key)])
          assert.deepStrictEqual(moved.map(Result.getOrThrow), ["OK", "moved", "moved"])
          const replica = fixture.nodes[3]
          yield* Effect.promise(() => fixture.failover(replica))
          assert.strictEqual(yield* client.run(Command.set(key, "after-promotion")), "OK")
          assert.strictEqual(yield* client.run(Command.get(key)), "after-promotion")
          yield* client.refresh
          assert.include((yield* client.nodes).map((node) => node.port), replica.port)
        }),
      90_000
    )
  })

  describe("Sentinel", () => {
    it.live(
      "discovers Sentinel primaries with independent ACL credentials and retires old sessions",
      () =>
        Effect.gen(function*() {
          const fixture = yield* Effect.acquireRelease(
            Effect.promise(() =>
              startSentinel({
                username: "data-user",
                password: "data-secret",
                sentinelUsername: "discovery-user",
                sentinelPassword: "discovery-secret"
              })
            ),
            (fixture) => Effect.promise(fixture.stop)
          )
          const client = yield* Client.make(makeConnector(), {
            username: "data-user",
            password: "data-secret",
            clientName: "effect-sentinel-acceptance",
            protocol: 3,
            topology: {
              _tag: "Sentinel",
              sentinels: fixture.sentinels,
              masterName: fixture.serviceName,
              username: "discovery-user",
              password: "discovery-secret"
            }
          })
          const old = yield* Effect.promise(fixture.primary)
          yield* client.run(Command.set("sentinel-key", "before-promotion"))
          const cachedTransaction = yield* Transaction.execute(client, [
            Command.set("sentinel-transaction", "before-promotion")
          ])
          assert.isNotNull(cachedTransaction)
          if (cachedTransaction === null) return assert.fail("Transaction unexpectedly conflicted")
          assert.strictEqual(Result.getOrThrow(cachedTransaction[0]), "OK")
          const subscription = yield* Subscription.make(client, "sentinel-events")
          const promoted = yield* Effect.promise(fixture.failover)
          yield* Effect.promise(() =>
            waitUntil(async () => {
              const node = fixture.dataNodes.find((node) => node.port === old.port)!
              const role = await node.command("ROLE") as Array<unknown>
              return role[0] === "slave"
            }, "Former Sentinel primary was not demoted")
          )
          // READONLY on the former primary is a server rejection, so discovery may safely retry.
          assert.strictEqual(yield* client.run(Command.set("sentinel-key", "after-promotion")), "OK")
          assert.strictEqual(yield* client.run(Command.get("sentinel-key")), "after-promotion")
          assert.strictEqual((yield* client.nodes)[0].port, promoted.port)
          const currentTransaction = yield* Transaction.execute(client, [
            Command.set("sentinel-transaction", "after-promotion")
          ])
          assert.isNotNull(currentTransaction)
          if (currentTransaction === null) return assert.fail("Transaction unexpectedly conflicted")
          assert.strictEqual(Result.getOrThrow(currentTransaction[0]), "OK")
          const currentNode = fixture.dataNodes.find((node) => node.port === promoted.port)!
          // Retire the old subscription socket to exercise rediscovery and resubscription.
          const previousNode = fixture.dataNodes.find((node) => node.port === old.port)!
          yield* Effect.promise(() => previousNode.command("CLIENT", "KILL", "TYPE", "pubsub"))
          yield* Effect.promise(() =>
            waitUntil(async () => {
              const counts = await currentNode.command("PUBSUB", "NUMSUB", "sentinel-events") as Array<unknown>
              return counts[1] === 1
            }, "Sentinel subscription did not follow promotion")
          )
          yield* client.execute(["PUBLISH", "sentinel-events", "restored"])
          assert.deepStrictEqual(
            (yield* Queue.take(subscription.messages)).message,
            new TextEncoder().encode("restored")
          )
          const oldNode = fixture.dataNodes.find((node) => node.port === old.port)!
          const clients = String(yield* Effect.promise(() => oldNode.command("CLIENT", "LIST")))
          // The old ordinary, subscription, and cached transaction sessions must all be gone.
          assert.strictEqual(
            clients.trim().split("\n").filter((line) => line.includes("name=effect-sentinel-acceptance")).length,
            0
          )
        }),
      90_000
    )

    it.live("uses available Sentinels and recovers after a primary process dies", () =>
      Effect.gen(function*() {
        const fixture = yield* Effect.acquireRelease(Effect.promise(() => startSentinel()), (fixture) =>
          Effect.promise(fixture.stop))
        yield* Effect.promise(() =>
          fixture.sentinels[2].stop()
        )
        const client = yield* Client.make(makeConnector({ connectTimeout: "500 millis" }), {
          topology: {
            _tag: "Sentinel",
            sentinels: [fixture.sentinels[2], fixture.sentinels[0], fixture.sentinels[1]],
            masterName: fixture.serviceName
          }
        })
        yield* client.run(Command.set("surviving-key", "before"))
        yield* Effect.promise(fixture.killPrimary)
        const outcome = yield* client.run(Command.set("surviving-key", "after")).pipe(Effect.result)
        // A failed stale socket request is not replayed; refreshed future work may succeed.
        if (outcome._tag === "Failure") {
          assert.include(["Connection", "Closed"], outcome.failure.reason)
          assert.include(["Unknown", "NotSent"], outcome.failure.outcome)
          yield* client.run(Command.set("surviving-key", "after"))
        }
        assert.strictEqual(yield* client.run(Command.get("surviving-key")), "after")
      }), 90_000)
  })
})
