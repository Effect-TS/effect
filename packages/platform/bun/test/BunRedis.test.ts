import * as BunRedis from "@effect/platform-bun/BunRedis"
import * as RedisClient from "@effect/redis/RedisClient"
import * as RedisCommand from "@effect/redis/RedisCommand"
import { assert, describe, it } from "@effect/vitest"
import { Config, Context, Effect, Exit, Layer, Scope } from "effect"
import * as Redis from "effect/persistence/Redis"
import { readFileSync } from "node:fs"
import type { AddressInfo } from "node:net"
import * as Tls from "node:tls"
import { startScriptedRedis } from "../../../redis/test/utils/redis-scripted.ts"

const cert = readFileSync(new URL("./fixtures/tls/cert.pem", import.meta.url))
const key = readFileSync(new URL("./fixtures/tls/key.pem", import.meta.url))

describe("BunRedis", () => {
  it.live("provides the client and persistence services and closes the socket with the layer", () =>
    Effect.gen(function*() {
      const server = yield* Effect.acquireRelease(
        Effect.promise(() => startScriptedRedis((request) => request.connection.send("+PONG\r\n"))),
        (server) => Effect.promise(server.stop)
      )
      const scope = yield* Scope.make()
      const context = yield* Layer.buildWithScope(
        BunRedis.layerConfig({ url: Config.succeed(`redis://${server.host}:${server.port}`) }),
        scope
      )
      const client = Context.get(context, BunRedis.BunRedis)
      assert.strictEqual(client, Context.get(context, RedisClient.RedisClient))
      assert.strictEqual(yield* client.run(RedisCommand.make(["PING"], RedisCommand.text)), "PONG")
      assert.strictEqual(yield* Context.get(context, Redis.Redis).send("PING"), "PONG")

      const closed = new Promise<void>((resolve) => server.connections[0].socket.once("close", () => resolve()))
      yield* Scope.close(scope, Exit.void)
      yield* Effect.promise(() => closed).pipe(Effect.timeout("1 second"))
    }))

  it.live("verifies TLS certificates through node:tls", () =>
    Effect.gen(function*() {
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
