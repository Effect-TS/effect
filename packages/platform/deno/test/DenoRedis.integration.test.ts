import * as DenoRedis from "@effect/platform-deno/DenoRedis"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Queue } from "effect"
import { PersistedQueue, Persistence, Redis } from "effect/persistence"
import * as RedisClient from "effect/redis/RedisClient"
import * as RedisCommand from "effect/redis/RedisCommand"
import * as PersistedCacheTest from "../../../effect/test/persistence/PersistedCacheTest.ts"
import * as PersistedQueueTest from "../../../effect/test/persistence/PersistedQueueTest.ts"
import { acquire, startRedis } from "../../../effect/test/redis/utils/redis-server.ts"

const RedisLayer = Layer.unwrap(
  acquire(() => startRedis()).pipe(
    Effect.map((fixture) => DenoRedis.layer({ socket: { host: fixture.host, port: fixture.port } })),
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

it.layer(RedisLayer, { timeout: "30 seconds" })("DenoRedis", (it) => {
  it.effect("provides the client and persistence services", () =>
    Effect.gen(function*() {
      const client = yield* DenoRedis.DenoRedis
      assert.strictEqual(client, yield* RedisClient.RedisClient)
      yield* client.run(RedisCommand.set("deno:key", "value"))

      const redis = yield* Redis.Redis
      assert.strictEqual(yield* redis.send("GET", "deno:key"), "value")
      const subscription = yield* redis.subscribe("deno:channel")
      yield* redis.send("PUBLISH", "deno:channel", "hello")
      assert.deepStrictEqual(yield* Queue.take(subscription), { channel: "deno:channel", message: "hello" })
    }))
})

describe("DenoRedis", () => {
  it.live("connects through a Unix socket", () =>
    Effect.gen(function*() {
      const fixture = yield* acquire(() => startRedis({ unixSocket: true }))
      const client = yield* DenoRedis.make({ socket: { path: fixture.unixSocketPath } })
      yield* client.run(RedisCommand.set("deno:unix", "value"))
      assert.strictEqual(yield* client.run(RedisCommand.get("deno:unix")), "value")
    }))

  it.live("verifies TLS certificates through node:tls", () =>
    Effect.gen(function*() {
      const read = (file: string) => Deno.readTextFileSync(new URL(`./fixtures/tls/${file}`, import.meta.url))
      const ca = read("ca.pem")
      const listener = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Deno.listenTls({ hostname: "127.0.0.1", port: 0, cert: read("cert.pem"), key: read("key.pem") })
        ),
        (listener) => Effect.sync(() => listener.close())
      )
      const pong = new TextEncoder().encode("+PONG\r\n")
      const serve = async (connection: Deno.TlsConn) => {
        const buffer = new Uint8Array(1024)
        while (await connection.read(buffer) !== null) await connection.write(pong)
      }
      yield* Effect.promise(async () => {
        for await (const connection of listener) serve(connection).catch(() => connection.close())
      }).pipe(Effect.forkScoped)
      const endpoint = { host: "127.0.0.1", port: listener.addr.port }

      for (const tls of [true, { ca, servername: "wrong.invalid" }]) {
        const error = yield* DenoRedis.make({ socket: { ...endpoint, tls } }).pipe(Effect.flip)
        assert.strictEqual(error.reason, "Connection")
      }
      const client = yield* DenoRedis.make({ socket: { ...endpoint, tls: { ca, servername: "localhost" } } })
      assert.strictEqual(yield* client.run(RedisCommand.make(["PING"], RedisCommand.text)), "PONG")
    }))
})
