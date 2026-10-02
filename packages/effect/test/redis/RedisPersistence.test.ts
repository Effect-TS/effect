import { assert, describe, it } from "@effect/vitest"
import { Crypto, Effect } from "effect"
import * as Redis from "effect/persistence/Redis"
import * as Client from "effect/redis/RedisClient"
import type { Endpoint } from "effect/redis/RedisConnection"
import { RedisError } from "effect/redis/RedisError"
import * as Persistence from "effect/redis/RedisPersistence"
import type { Reply } from "effect/redis/RedisProtocol"
import * as SocketConnector from "effect/socket/SocketConnector"
import { sockets } from "./utils/redis-connector.ts"
import { bulk, startScriptedRedis } from "./utils/redis-scripted.ts"

const endpoint = { host: "redis", port: 6379 }
const blob = (value: string): Reply => ({ _tag: "BlobString", value: new TextEncoder().encode(value) })
const client = (
  execute: Client.RedisClient["execute"],
  options?: { readonly nodes?: ReadonlyArray<Endpoint>; readonly cluster?: boolean }
): Client.RedisClient => ({
  config: { topology: options?.cluster ? { _tag: "Cluster", seeds: [endpoint] } : { _tag: "Standalone", endpoint } },
  execute,
  closed: Effect.never,
  nodes: Effect.succeed(options?.nodes ?? [endpoint]),
  refresh: Effect.void,
  reserve: () => Effect.die("Unexpected reservation"),
  run: () => Effect.die("Unexpected command"),
  pipeline: () => Effect.die("Unexpected pipeline")
})
const crypto = Crypto.make({
  randomBytes: (size) => new Uint8Array(size),
  hmac: () => Effect.die("Unexpected HMAC"),
  pbkdf2: () => Effect.die("Unexpected PBKDF2"),
  digest: () => Effect.succeed(new Uint8Array(20))
})

describe("RedisPersistence", () => {
  it.live("provides client and persistence services through platform capabilities", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) =>
            request.connection.send(
              String(request.args[0]) === "PING" ? "+PONG\r\n" : bulk("value")
            )
          )
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const values = yield* Effect.gen(function*() {
        const native = yield* Client.RedisClient
        const persistence = yield* Redis.Redis
        return [native.config.topology?._tag, yield* persistence.send("GET", "key")]
      }).pipe(
        Effect.provide(Persistence.layer({ socket: fixture })),
        Effect.provideService(SocketConnector.SocketConnector, sockets),
        Effect.provideService(Crypto.Crypto, crypto)
      )
      assert.deepStrictEqual(values, ["Standalone", "value"])
    }))

  it.effect("hashes scripts with platform Crypto and caches the digest", () =>
    Effect.gen(function*() {
      const commands: Array<ReadonlyArray<unknown>> = []
      const hashes: Array<readonly [Crypto.DigestAlgorithm, string]> = []
      const adapter = yield* Persistence.make(client((args) =>
        Effect.sync(() => {
          commands.push(args)
          return { _tag: "Integer", value: BigInt(1) } as const
        })
      )).pipe(Effect.provideService(
        Crypto.Crypto,
        Crypto.make({
          hmac: () => Effect.die("Unexpected HMAC"),
          pbkdf2: () => Effect.die("Unexpected PBKDF2"),
          randomBytes: (size) => new Uint8Array(size),
          digest: (algorithm, bytes) =>
            Effect.sync(() => {
              hashes.push([algorithm, new TextDecoder().decode(bytes)])
              return new Uint8Array(20).fill(171)
            })
        })
      ))
      const script = Redis.script((key: string) => [key], { lua: "return 1", numberOfKeys: 1 })
      yield* adapter.eval(script)("key")
      yield* adapter.eval(script)("other")
      assert.deepStrictEqual(hashes, [["SHA-1", "return 1"]])
      assert.deepStrictEqual(commands, [
        ["EVALSHA", "ab".repeat(20), "1", "key"],
        ["EVALSHA", "ab".repeat(20), "1", "other"]
      ])
    }))

  it.effect("scans every Cluster primary and deduplicates physical keys", () =>
    Effect.gen(function*() {
      const second = { host: "other", port: 6380 }
      const commands: Array<readonly [ReadonlyArray<unknown>, Endpoint | undefined]> = []
      const adapter = yield* Persistence.make(client((args, routing) =>
        Effect.sync(() => {
          commands.push([args, routing?.node])
          return {
            _tag: "Array",
            values: [blob("0"), { _tag: "Array", values: [blob("shared"), blob(routing!.node!.host)] }]
          } as const
        }), { cluster: true, nodes: [endpoint, second] })).pipe(Effect.provideService(Crypto.Crypto, crypto))
      assert.isTrue(adapter.cluster)
      assert.deepStrictEqual(new Set(yield* adapter.scan("prefix:*")), new Set(["shared", "redis", "other"]))
      assert.deepStrictEqual(commands, [
        [["SCAN", "0", "MATCH", "prefix:*", "COUNT", "100"], endpoint],
        [["SCAN", "0", "MATCH", "prefix:*", "COUNT", "100"], second]
      ])
    }))

  it.effect("preserves native failures through the persistence error boundary", () =>
    Effect.gen(function*() {
      const native = new RedisError({ reason: "Connection", message: "Disconnected", outcome: "Unknown" })
      const adapter = yield* Persistence.make(client(() => Effect.fail(native))).pipe(
        Effect.provideService(Crypto.Crypto, crypto)
      )
      const error = yield* adapter.send("GET", "key").pipe(Effect.flip)
      assert.strictEqual(error.cause, native)
      assert.isFalse(adapter.cluster)
    }))
})
