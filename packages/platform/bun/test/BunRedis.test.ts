import * as BunRedis from "@effect/platform-bun/BunRedis"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import { RedisError } from "@effect/redis/RedisError"
import * as Protocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import { Config, Context, Deferred, Effect, Exit, Fiber, Layer, Scope } from "effect"
import * as Redis from "effect/persistence/Redis"
import { readFileSync } from "node:fs"
import type { AddressInfo } from "node:net"
import * as Tls from "node:tls"
import { startScriptedRedis } from "../../../redis/test/utils/redis-scripted.ts"

const cert = readFileSync(new URL("./fixtures/tls/cert.pem", import.meta.url))
const key = readFileSync(new URL("./fixtures/tls/key.pem", import.meta.url))
const tlsServer = Effect.acquireRelease(
  Effect.callback<Tls.Server>((resume) => {
    const server = Tls.createServer({ cert, key }, (socket) => {
      const parser = Protocol.makeParser()
      socket.on("error", () => {})
      socket.on("data", (bytes: Buffer) => {
        for (const request of parser.push(bytes)) {
          const command = Protocol.toValue(request) as ReadonlyArray<string>
          socket.write(command[0] === "PING" ? "+PONG\r\n" : "+OK\r\n")
        }
      })
    })
    server.once("error", (cause) => resume(Effect.die(cause)))
    server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
    return Effect.sync(() => {
      server.close()
    })
  }),
  (server) =>
    Effect.callback<void>((resume) => {
      server.close(() => resume(Effect.void))
    })
)

describe("BunRedis", () => {
  it.live("provides one configured native client and closes it with the layer scope", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() => startScriptedRedis((request) => request.connection.send("+PONG\r\n"))),
        (fixture) => Effect.promise(fixture.stop)
      )
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const context = yield* Layer.buildWithScope(
        BunRedis.layerConfig({
          url: Config.succeed(`redis://${fixture.host}:${fixture.port}`)
        }),
        scope
      )
      const client = Context.get(context, BunRedis.BunRedis)
      assert.strictEqual(client, Context.get(context, Client.RedisClient))
      assert.strictEqual(yield* client.run(Command.make(["PING"], Command.text)), "PONG")
      assert.strictEqual(yield* Context.get(context, Redis.Redis).send("PING"), "PONG")
      assert.strictEqual(fixture.connections.length, 1)
      const disconnected = new Promise<void>((resolve) => fixture.connections[0].socket.once("close", () => resolve()))
      yield* Scope.close(scope, Exit.void)
      yield* Effect.promise(() => disconnected).pipe(Effect.timeout("1 second"))
      yield* client.closed
      const error = yield* client.run(Command.get("key")).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Closed")
      assert.strictEqual(error.outcome, "NotSent")
    }))

  it.live("reports authentication failures and releases the acquired socket", () =>
    Effect.gen(function*() {
      const disconnected = Promise.withResolvers<void>()
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            assert.deepStrictEqual(request.args.map((arg) => arg.toString()), ["AUTH", "secret"])
            request.connection.socket.once("close", () => disconnected.resolve())
            request.connection.send("-WRONGPASS invalid credentials\r\n")
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const error = yield* Layer.build(BunRedis.layer({
        url: `redis://:secret@${fixture.host}:${fixture.port}`
      })).pipe(Effect.flip)
      assert.instanceOf(error, RedisError)
      assert.strictEqual(error.reason, "Server")
      assert.strictEqual(error.code, "WRONGPASS")
      yield* Effect.promise(() => disconnected.promise).pipe(Effect.timeout("1 second"))
    }))

  it.live("releases the socket when layer acquisition is interrupted", () =>
    Effect.gen(function*() {
      const received = yield* Deferred.make<void>()
      const disconnected = Promise.withResolvers<void>()
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            request.connection.socket.once("close", () => disconnected.resolve())
            Deferred.doneUnsafe(received, Effect.void)
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const acquiring = yield* Layer.build(BunRedis.layer({
        url: `redis://:secret@${fixture.host}:${fixture.port}`
      })).pipe(Effect.forkChild)
      yield* Deferred.await(received)
      yield* Fiber.interrupt(acquiring)
      yield* Effect.promise(() => disconnected.promise).pipe(Effect.timeout("1 second"))
    }))

  it.effect("preserves configuration failures before opening a connection", () =>
    Effect.gen(function*() {
      const error = yield* Layer.build(BunRedis.layerConfig({
        url: Config.String("EFFECT_TEST_BUN_REDIS_MISSING")
      })).pipe(Effect.flip)
      assert.strictEqual(error._tag, "ConfigError")
    }))

  it.live("validates TLS certificates and hostnames through the native constructor", () =>
    Effect.gen(function*() {
      const server = yield* tlsServer
      const endpoint = { host: "127.0.0.1", port: (server.address() as AddressInfo).port }
      for (const tls of [true, { ca: cert, servername: "wrong.example" }] as const) {
        const error = yield* BunRedis.make({ socket: { ...endpoint, tls } }).pipe(Effect.flip)
        assert.instanceOf(error, RedisError)
        assert.strictEqual(error.reason, "Connection")
      }
      const client = yield* BunRedis.make({ socket: { ...endpoint, tls: { ca: cert, servername: "localhost" } } })
      assert.strictEqual(yield* client.run(Command.set("tls:key", "value")), "OK")
      assert.strictEqual(yield* client.run(Command.make(["PING"], Command.text)), "PONG")
    }))
})
