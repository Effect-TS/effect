import * as DenoRedis from "@effect/platform-deno/DenoRedis"
import * as RedisClient from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Protocol from "@effect/redis/RedisProtocol"
import * as Subscription from "@effect/redis/RedisSubscription"
import * as Transaction from "@effect/redis/RedisTransaction"
import { assert, describe, it } from "@effect/vitest"
import { Config, Context, Deferred, Effect, Fiber, Layer, Queue, Result, Schema } from "effect"
import { PersistedQueue, Persistence, Redis } from "effect/persistence"
import * as PersistedCacheTest from "../../../effect/test/persistence/PersistedCacheTest.ts"
import * as PersistedQueueTest from "../../../effect/test/persistence/PersistedQueueTest.ts"
import { startCluster, startRedis, startSentinel } from "../../../redis/test/utils/redis-server.ts"

const RedisLayer = Layer.unwrap(
  Effect.gen(function*() {
    const fixture = yield* Effect.acquireRelease(
      Effect.promise(() => startRedis()),
      (fixture) => Effect.promise(fixture.stop)
    )
    return DenoRedis.layer({
      socket: { host: fixture.host, port: fixture.port }
    })
  }).pipe(
    Effect.catchCause(() => Effect.fail(new PersistedCacheTest.TransientError()))
  )
)

PersistedCacheTest.suite(
  "DenoRedis",
  Persistence.layerRedis.pipe(Layer.provide(RedisLayer))
)

PersistedQueueTest.suite(
  "DenoRedis",
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

it.layer(PersistedQueueRedisLayer, { timeout: "30 seconds" })(
  "PersistedQueue (DenoRedis)",
  (it) => {
    it.effect("receives published messages", () =>
      Effect.gen(function*() {
        const redis = yield* Redis.Redis
        const subscription = yield* redis.subscribe("effect-test")

        const subscribers = yield* redis.send<number>("PUBLISH", "effect-test", "hello")
        assert.strictEqual(subscribers, 1)

        assert.deepStrictEqual(yield* Queue.take(subscription), {
          channel: "effect-test",
          message: "hello"
        })
      }))

    it.effect("moves exhausted elements to the failed list", () =>
      Effect.gen(function*() {
        const redis = yield* DenoRedis.DenoRedis
        const queueName = "test-redis-failed"

        const queue = yield* PersistedQueue.make({
          name: queueName,
          schema: RedisItem,
          maxAttempts: 1
        })
        const id = yield* queue.offer({ n: 42 })
        const error = yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip)
        assert.strictEqual(error, "boom")

        const failed = Protocol.toValue(
          yield* redis.execute(["LRANGE", `effectq:${queueName}:failed`, "0", "-1"])
        ) as Array<string>
        assert.strictEqual(failed.length, 1)
        const failedItem = JSON.parse(failed[0])
        assert.strictEqual(failedItem.id, id)
        assert.deepStrictEqual(failedItem.element, { n: 42 })
        assert.strictEqual(failedItem.attempts, 1)

        const pending = yield* redis.run(Command.make(["HLEN", `effectq:${queueName}:pending`], Command.integer))
        assert.strictEqual(pending, 0n)
      }))
  }
)

describe("Deno native Redis client", () => {
  for (const protocol of [2, 3] as const) {
    it.live(
      "supports binary pipelines, transactions, and subscriptions with RESP" + protocol,
      () =>
        Effect.gen(function*() {
          const fixture = yield* redisFixture
          const client = yield* DenoRedis.make({
            socket: { host: fixture.host, port: fixture.port },
            protocol
          })
          yield* client.execute(["HSET", "deno:hash", "field", "value"])
          assert.deepStrictEqual(
            Protocol.toValue(yield* client.execute(["HGETALL", "deno:hash"])),
            protocol === 2 ? ["field", "value"] : new Map([["field", "value"]])
          )
          const payload = new Uint8Array(Array.from({ length: 4096 }, (_, index) => index % 256))
          assert.deepStrictEqual(
            yield* client.pipeline([Command.set("deno:binary", payload), Command.getBytes("deno:binary")]),
            [Result.succeed("OK"), Result.succeed(payload)]
          )
          assert.deepStrictEqual(
            yield* Transaction.execute(client, [
              Command.set("deno:transaction", payload),
              Command.getBytes("deno:transaction")
            ]),
            [Result.succeed("OK"), Result.succeed(payload)]
          )
          const subscription = yield* Subscription.make(client, "deno:channel")
          assert.strictEqual(Protocol.toValue(yield* client.execute(["PUBLISH", "deno:channel", payload])), 1)
          const publication = yield* Queue.take(subscription.messages)
          assert.deepStrictEqual(publication.channel, encoder.encode("deno:channel"))
          assert.deepStrictEqual(publication.message, payload)
          assert.isUndefined(publication.pattern)
        })
    )
  }

  it.live("provides the same native client and persistence services from configured options", () =>
    Effect.gen(function*() {
      const fixture = yield* redisFixture
      const context = yield* Layer.build(DenoRedis.layerConfig({
        url: Config.succeed("redis://unreachable.invalid:1/2"),
        socket: { host: Config.succeed(fixture.host), port: Config.succeed(fixture.port) },
        database: Config.succeed(3)
      }))
      const client = Context.get(context, DenoRedis.DenoRedis)
      assert.strictEqual(Context.get(context, RedisClient.RedisClient), client)
      const redis = Context.get(context, Redis.Redis)
      assert.isFalse(redis.cluster)
      yield* client.run(Command.set("deno:configured", "value"))
      assert.strictEqual(yield* redis.send("GET", "deno:configured"), "value")
      const databaseFromUrl = yield* DenoRedis.make({ url: "redis://" + fixture.host + ":" + fixture.port + "/2" })
      assert.isNull(yield* databaseFromUrl.run(Command.get("deno:configured")))
    }))

  it.live("connects through a Unix socket", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startRedis({ unixSocket: true })), (fixture) =>
        Effect.promise(fixture.stop))
      assert.isDefined(fixture.unixSocketPath)
      const client = yield* DenoRedis.make({ socket: { path: fixture.unixSocketPath } })
      yield* client.run(Command.set("deno:unix", "value"))
      assert.strictEqual(yield* client.run(Command.get("deno:unix")), "value")
      assert.strictEqual(
        yield* Effect.promise(() =>
          fixture.command("GET", "deno:unix")
        ),
        "value"
      )
    }))

  it.live("verifies the TLS authority and hostname before exchanging commands", () =>
    Effect.gen(function*() {
      const ca = Deno.readTextFileSync(new URL("./fixtures/tls/ca.pem", import.meta.url))
      const cert = Deno.readTextFileSync(new URL("./fixtures/tls/cert.pem", import.meta.url))
      const key = Deno.readTextFileSync(new URL("./fixtures/tls/key.pem", import.meta.url))
      for (const mode of ["trusted", "untrusted", "wrong-hostname"] as const) {
        const listener = yield* Effect.acquireRelease(
          Effect.sync(() => Deno.listenTls({ hostname: "127.0.0.1", port: 0, cert, key })),
          (listener) => Effect.sync(() => listener.close())
        )
        const server = yield* Effect.gen(function*() {
          const connection = yield* Effect.acquireRelease(Effect.promise(() => listener.accept()), (connection) =>
            Effect.sync(() => connection.close()))
          assert.deepStrictEqual(yield* readRequest(connection), ["PING"])
          yield* write(connection, "+PONG\r\n")
          assert.deepStrictEqual(yield* readRequest(connection), ["ECHO", "tls"])
          yield* write(connection, "$3\r\ntls\r\n")
        }).pipe(Effect.ignoreCause, Effect.forkChild)
        const port = (listener.addr as Deno.NetAddr).port
        const options: DenoRedis.Options = {
          url: "rediss://127.0.0.1:" + port,
          socket: {
            tls: mode === "untrusted" ? true : { ca, servername: mode === "trusted" ? "localhost" : "wrong.invalid" }
          }
        }
        if (mode === "trusted") {
          const client = yield* DenoRedis.make(options)
          assert.strictEqual(yield* client.run(Command.make(["ECHO", "tls"], Command.text)), "tls")
          yield* Fiber.join(server)
        } else {
          const result = yield* Effect.result(DenoRedis.make(options))
          assert.strictEqual(result._tag, "Failure")
          if (result._tag === "Failure") {
            assert.strictEqual(result.failure.reason, "Connection")
          }
          yield* Fiber.interrupt(server)
        }
      }
    }))

  it.live("binds Cluster routing and persistence scanning to the Deno service", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startCluster()), (fixture) =>
        Effect.promise(fixture.stop))
      const context = yield* Layer.build(DenoRedis.layer({ topology: { _tag: "Cluster", seeds: fixture.seeds } }))
      const client = Context.get(context, DenoRedis.DenoRedis)
      assert.strictEqual(Context.get(context, RedisClient.RedisClient), client)
      const redis = Context.get(context, Redis.Redis)
      assert.isTrue(redis.cluster)
      const keys = ["deno-cluster:{first}:key", "deno-cluster:{second}:key"]
      assert.deepStrictEqual(
        yield* client.pipeline(keys.map((key) =>
          Command.set(key, key)
        )),
        keys.map(() => Result.succeed("OK"))
      )
      assert.deepStrictEqual(
        yield* client.pipeline(keys.map(Command.get)),
        keys.map((key) => Result.succeed(key))
      )
      assert.deepStrictEqual(Array.from(yield* redis.scan("deno-cluster:*")).sort(), keys.slice().sort())
      const scriptKey = Redis.key(redis, "deno-cluster-script")
      const increment = redis.eval(
        Redis.script((key: string) => [key], {
          numberOfKeys: 1,
          lua: "return redis.call('INCR', KEYS[1])"
        }).withReturnType<number>()
      )
      assert.strictEqual(yield* increment(scriptKey), 1)
      assert.strictEqual(yield* increment(scriptKey), 2)
    }), 30_000)

  it.live("binds Sentinel discovery and persistence to the Deno service", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startSentinel()), (fixture) =>
        Effect.promise(fixture.stop))
      const context = yield* Layer.build(DenoRedis.layer({
        topology: { _tag: "Sentinel", masterName: fixture.serviceName, sentinels: fixture.sentinels }
      }))
      const client = Context.get(context, DenoRedis.DenoRedis)
      assert.strictEqual(Context.get(context, RedisClient.RedisClient), client)
      const redis = Context.get(context, Redis.Redis)
      assert.isFalse(redis.cluster)
      yield* client.run(Command.set("deno:sentinel", "value"))
      assert.strictEqual(yield* redis.send("GET", "deno:sentinel"), "value")
      assert.deepStrictEqual(yield* redis.scan("deno:sentinel"), ["deno:sentinel"])
    }), 30_000)
})

it.live("closes the connection when interrupted during acquisition", () =>
  Effect.gen(function*() {
    const listener = yield* makeListener
    const authReceived = yield* Deferred.make<void>()
    const server = yield* Effect.gen(function*() {
      const connection = yield* accept(listener)
      assert.deepStrictEqual(yield* readRequest(connection), ["AUTH", "secret"])
      yield* Deferred.succeed(authReceived, void 0)
      return yield* read(connection)
    }).pipe(Effect.forkChild)
    const port = (listener.addr as Deno.NetAddr).port
    const acquiring = yield* Layer.build(DenoRedis.layer({
      url: "redis://:secret@127.0.0.1:" + port
    })).pipe(Effect.forkChild({ startImmediately: true }))
    yield* Deferred.await(authReceived)
    yield* Fiber.interrupt(acquiring)
    assert.isNull(yield* Fiber.join(server))
  }))

it.live("uses the URL username for two-argument AUTH", () =>
  Effect.gen(function*() {
    const listener = yield* makeListener
    const server = yield* serveAuth(listener).pipe(Effect.forkChild)
    const port = (listener.addr as Deno.NetAddr).port
    yield* Layer.build(DenoRedis.layer({
      url: "redis://alice:secret@127.0.0.1:" + port,
      password: undefined
    }))
    assert.deepStrictEqual(yield* Fiber.join(server), ["AUTH", "alice", "secret"])
  }))

it.live("decodes URL authority credentials once", () =>
  Effect.gen(function*() {
    const listener = yield* makeListener
    const server = yield* serveAuth(listener).pipe(Effect.forkChild)
    const port = (listener.addr as Deno.NetAddr).port
    yield* Layer.build(DenoRedis.layer({
      url: "redis://app%3A%2540:p%40ss%2525@127.0.0.1:" + port
    }))
    assert.deepStrictEqual(yield* Fiber.join(server), ["AUTH", "app:%40", "p@ss%25"])
  }))

it.live("prefers explicit credentials over URL credentials", () =>
  Effect.gen(function*() {
    const listener = yield* makeListener
    const server = yield* serveAuth(listener).pipe(Effect.forkChild)
    const port = (listener.addr as Deno.NetAddr).port
    yield* Layer.build(DenoRedis.layer({
      url: "redis://alice:secret@127.0.0.1:" + port,
      username: "bob",
      password: "other"
    }))
    assert.deepStrictEqual(yield* Fiber.join(server), ["AUTH", "bob", "other"])
  }))

const RedisItem = Schema.Struct({ n: Schema.Number })
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const redisFixture = Effect.acquireRelease(
  Effect.promise(() => startRedis()),
  (fixture) => Effect.promise(fixture.stop)
)
const makeListener = Effect.acquireRelease(
  Effect.sync(() => Deno.listen({ hostname: "127.0.0.1", port: 0 })),
  (listener) => Effect.sync(() => listener.close())
)
const accept = (listener: Deno.TcpListener) =>
  Effect.acquireRelease(
    Effect.promise(() => listener.accept()),
    (connection) => Effect.sync(() => connection.close())
  )
const read = (connection: Deno.Conn) =>
  Effect.promise(async () => {
    const buffer = new Uint8Array(1024)
    const size = await connection.read(buffer)
    return size === null ? null : decoder.decode(buffer.subarray(0, size))
  })
const readRequest = (connection: Deno.Conn) =>
  Effect.promise(async () => {
    const parser = Protocol.makeParser()
    const buffer = new Uint8Array(1024)
    while (true) {
      const size = await connection.read(buffer)
      if (size === null) throw new Error("Redis client closed before sending a complete request")
      const replies = parser.push(buffer.subarray(0, size))
      if (replies.length === 0) continue
      assert.strictEqual(replies.length, 1)
      return Protocol.toValue(replies[0])
    }
  })
const write = (connection: Deno.Conn, value: string) =>
  Effect.promise(async () => {
    const bytes = encoder.encode(value)
    let offset = 0
    while (offset < bytes.length) offset += await connection.write(bytes.subarray(offset))
  })
const serveAuth = Effect.fnUntraced(function*(listener: Deno.TcpListener) {
  const connection = yield* accept(listener)
  const request = yield* readRequest(connection)
  yield* write(connection, "+OK\r\n")
  assert.deepStrictEqual(yield* readRequest(connection), ["PING"])
  yield* write(connection, "+PONG\r\n")
  return request
})
