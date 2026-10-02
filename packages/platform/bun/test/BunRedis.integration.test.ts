import * as BunRedis from "@effect/platform-bun/BunRedis"
import { assert, describe, it } from "@effect/vitest"
import { Config, Context, Effect, Layer, Queue } from "effect"
import * as Redis from "effect/persistence/Redis"
import * as RedisClient from "effect/redis/RedisClient"
import * as RedisCommand from "effect/redis/RedisCommand"
import { readFileSync } from "node:fs"
import type { AddressInfo } from "node:net"
import * as Tls from "node:tls"
import { acquire, startRedis } from "../../../effect/test/redis/utils/redis-server.ts"

describe("BunRedis", () => {
  it.live("runs commands, scripts and subscriptions against Redis", () =>
    Effect.gen(function*() {
      const fixture = yield* acquire(() => startRedis())
      const context = yield* Layer.build(
        BunRedis.layerConfig({ url: Config.succeed(`redis://${fixture.host}:${fixture.port}`) })
      )
      const client = Context.get(context, BunRedis.BunRedis)
      assert.strictEqual(client, Context.get(context, RedisClient.RedisClient))
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
      const fixture = yield* acquire(() => startRedis({ unixSocket: true }))
      const client = yield* BunRedis.make({ socket: { path: fixture.unixSocketPath } })
      assert.strictEqual(yield* client.run(RedisCommand.set("bun:unix", "value")), "OK")
      assert.strictEqual(yield* client.run(RedisCommand.get("bun:unix")), "value")
    }))

  it.live("verifies TLS certificates through node:tls", () =>
    Effect.gen(function*() {
      // Bun cannot read the subjectAltName of the shared Ed25519 fixtures, so these are RSA.
      const cert = readFileSync(new URL("./fixtures/tls/cert.pem", import.meta.url))
      const key = readFileSync(new URL("./fixtures/tls/key.pem", import.meta.url))
      const server = yield* Effect.acquireRelease(
        Effect.callback<Tls.Server>((resume) => {
          const server = Tls.createServer({ cert, key }, (socket) => {
            socket.on("error", () => {})
            socket.on("data", () => socket.write("+PONG\r\n"))
          })
          server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
        }),
        (server) =>
          Effect.callback<void>((resume) => {
            server.close(() => resume(Effect.void))
          })
      )
      const endpoint = { host: "127.0.0.1", port: (server.address() as AddressInfo).port }

      for (const tls of [true, { ca: cert, servername: "wrong.example" }]) {
        const error = yield* BunRedis.make({ socket: { ...endpoint, tls } }).pipe(Effect.flip)
        assert.strictEqual(error.reason, "Connection")
      }
      const client = yield* BunRedis.make({ socket: { ...endpoint, tls: { ca: cert, servername: "localhost" } } })
      assert.strictEqual(yield* client.run(RedisCommand.make(["PING"], RedisCommand.text)), "PONG")
    }))
})
