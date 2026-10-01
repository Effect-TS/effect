import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Connection from "@effect/redis/RedisConnection"
import type { RedisError } from "@effect/redis/RedisError"
import * as Protocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Scope } from "effect"
import type * as Result from "effect/Result"
import * as TestClock from "effect/testing/TestClock"
import { array, bulk, type ScriptedRedis, startScriptedRedis } from "./utils/redis-scripted.ts"

const server = Effect.acquireRelease(
  Effect.promise(() => startScriptedRedis()),
  (server) => Effect.promise(() => server.stop())
)

const nextRequest = (fixture: ScriptedRedis) => Effect.promise(fixture.nextRequest)

const failure = <A>(result: Result.Result<A, RedisError>): RedisError => {
  if (result._tag !== "Failure") return assert.fail("Expected Redis failure")
  return result.failure
}

describe("RedisConnection", () => {
  it.live("completes the handshake before returning", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const acquiring = yield* Connection.make(makeConnector(), fixture, {
        username: "user",
        password: "secret",
        protocol: 3,
        database: 2,
        clientName: "effect"
      }).pipe(Effect.forkChild)
      for (
        const [args, response] of [
          [["AUTH", "user", "secret"], "+OK\r\n"],
          [["HELLO", "3"], "%1\r\n+proto\r\n:3\r\n"],
          [["SELECT", "2"], "+OK\r\n"],
          [["CLIENT", "SETNAME", "effect"], "+OK\r\n"]
        ] as const
      ) {
        const request = yield* nextRequest(fixture)
        assert.deepStrictEqual(request.args.map(String), [...args])
        request.connection.send(response)
      }
      assert.isTrue((yield* Fiber.join(acquiring)).isOpen())
    }))

  it.live("releases the socket when authentication fails", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const acquiring = yield* Connection.make(makeConnector(), fixture, { password: "secret" }).pipe(
        Effect.result,
        Effect.forkChild
      )
      const request = yield* nextRequest(fixture)
      const closed = new Promise<void>((resolve) => request.connection.socket.once("close", () => resolve()))
      request.connection.send("-WRONGPASS invalid username-password pair\r\n")
      assert.strictEqual(failure(yield* Fiber.join(acquiring)).code, "WRONGPASS")
      yield* Effect.promise(() => closed).pipe(Effect.timeout("1 second"))
      assert.isTrue(request.connection.socket.destroyed)
    }))

  it.effect("rejects invalid options before dialing", () =>
    Effect.gen(function*() {
      let opens = 0
      const connector: Connection.Connector = () =>
        Effect.sync(() => {
          opens++
        }).pipe(Effect.andThen(Effect.die("Unexpected connection")))
      for (
        const [config, reason] of [
          [{ maxFrameSize: 0 }, "Protocol"],
          [{ maxDepth: 0 }, "Protocol"],
          [{ commandTimeout: -1 }, "Timeout"],
          [{ commandTimeout: NaN }, "Timeout"],
          [{ maxPendingCommands: 0 }, "Capacity"]
        ] as const
      ) {
        const error = failure(yield* Effect.result(Connection.make(connector, { host: "unused", port: 6379 }, config)))
        assert.strictEqual(error.reason, reason)
        assert.strictEqual(error.outcome, "NotSent")
      }
      assert.strictEqual(opens, 0)
    }))

  it.live("rejects commands beyond the pending limit without sending them", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture, { maxPendingCommands: 1 })
      const first = yield* connection.execute(["GET", "first"]).pipe(Effect.forkChild)
      const request = yield* nextRequest(fixture)
      const error = failure(yield* Effect.result(connection.execute(["GET", "rejected"])))
      assert.strictEqual(error.reason, "Capacity")
      assert.strictEqual(error.outcome, "NotSent")
      request.connection.send(bulk("first"))
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(first)), "first")
      const next = yield* connection.execute(["GET", "next"]).pipe(Effect.forkChild)
      assert.deepStrictEqual((yield* nextRequest(fixture)).args.map(String), ["GET", "next"])
      request.connection.send(bulk("next"))
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(next)), "next")
    }))

  it.live("rejects a command larger than the queued byte limit without sending it", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture, { maxQueuedBytes: 32 })
      const error = failure(yield* Effect.result(connection.execute(["SET", "key", "x".repeat(32)])))
      assert.strictEqual(error.reason, "Capacity")
      assert.strictEqual(error.outcome, "NotSent")
      const next = yield* connection.execute(["GET", "key"]).pipe(Effect.forkChild)
      const request = yield* nextRequest(fixture)
      assert.deepStrictEqual(request.args.map(String), ["GET", "key"])
      request.connection.send("$-1\r\n")
      assert.isNull(Protocol.toValue(yield* Fiber.join(next)))
    }))

  it.live("matches replies to concurrent commands in FIFO order", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const fibers = yield* Effect.forEach(
        ["a", "b", "c", "d"],
        (value) => connection.execute(["ECHO", value]).pipe(Effect.forkChild)
      )
      for (let index = 0; index < fibers.length; index++) {
        const request = yield* nextRequest(fixture)
        request.connection.send(bulk(request.args[1]))
      }
      const replies = yield* Effect.forEach(fibers, Fiber.join)
      assert.deepStrictEqual(replies.map(Protocol.toValue), ["a", "b", "c", "d"])
    }))

  it.live("writes a pipeline in one batch and preserves reply positions", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      let writes = 0
      const base = makeConnector()
      const connector: Connection.Connector = (endpoint) =>
        base(endpoint).pipe(Effect.map((transport) => ({
          ...transport,
          write: (bytes) =>
            Effect.sync(() => {
              writes++
            }).pipe(Effect.andThen(transport.write(bytes)))
        })))
      const connection = yield* Connection.make(connector, fixture)
      const pending = yield* connection.pipeline([
        { arguments: ["SET", "key", "value"] },
        { arguments: ["LPUSH", "key", "wrong-type"] },
        { arguments: ["GET", "key"] }
      ]).pipe(Effect.forkChild)
      const requests = yield* Effect.forEach([0, 1, 2], () => nextRequest(fixture))
      assert.deepStrictEqual(requests.map((request) => String(request.args[0])), ["SET", "LPUSH", "GET"])
      assert.strictEqual(writes, 1)
      requests[0].connection.send(Buffer.concat([Buffer.from("+OK\r\n-WRONGTYPE invalid value\r\n"), bulk("value")]))
      const results = yield* Fiber.join(pending)
      assert.strictEqual(results[0]._tag, "Success")
      assert.strictEqual(failure(results[1]).code, "WRONGTYPE")
      assert.deepStrictEqual(results[2]._tag === "Success" && Protocol.toValue(results[2].success), "value")
    }))

  it.live("keeps the connection open after a server error reply", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pending = yield* connection.execute(["GET", "key"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* nextRequest(fixture)
      request.connection.send("-WRONGTYPE Operation against a key holding the wrong kind of value\r\n")
      const error = failure(yield* Fiber.join(pending))
      assert.strictEqual(error.reason, "Server")
      assert.strictEqual(error.code, "WRONGTYPE")
      assert.isTrue(connection.isOpen())
      const next = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      yield* nextRequest(fixture)
      request.connection.send("+PONG\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(next)), "PONG")
    }))

  it.live("fails transmitted commands as uncertain on a malformed reply", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const first = yield* connection.execute(["PING"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* nextRequest(fixture)
      const second = yield* connection.execute(["GET", "key"]).pipe(Effect.result, Effect.forkChild)
      yield* nextRequest(fixture)
      request.connection.send(":invalid\r\n")
      for (const fiber of [first, second]) {
        const error = failure(yield* Fiber.join(fiber))
        assert.strictEqual(error.reason, "Protocol")
        assert.strictEqual(error.outcome, "Unknown")
      }
      assert.isFalse(connection.isOpen())
      const rejected = failure(yield* Effect.result(connection.execute(["PING"])))
      assert.strictEqual(rejected.outcome, "NotSent")
    }))

  it.live("fails a truncated frame at EOF as a protocol error", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pending = yield* connection.execute(["GET", "key"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* nextRequest(fixture)
      request.connection.socket.end("$5\r\nab")
      const error = failure(yield* Fiber.join(pending))
      assert.strictEqual(error.reason, "Protocol")
      assert.strictEqual(error.outcome, "Unknown")
    }))

  it.live("fails a transmitted command as uncertain when the connection drops", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pending = yield* connection.execute(["INCR", "counter"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* nextRequest(fixture)
      request.connection.disconnect()
      assert.strictEqual(failure(yield* Fiber.join(pending)).outcome, "Unknown")
      assert.isFalse(connection.isOpen())
      const rejected = failure(yield* Effect.result(connection.execute(["INCR", "counter"])))
      assert.strictEqual(rejected.outcome, "NotSent")
      assert.strictEqual(fixture.connections.length, 1)
    }))

  it.live("consumes an interrupted command's reply before the next reply", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const first = yield* connection.execute(["INCR", "counter"]).pipe(Effect.forkChild)
      const request = yield* nextRequest(fixture)
      yield* Fiber.interrupt(first)
      const second = yield* connection.execute(["GET", "counter"]).pipe(Effect.forkChild)
      yield* nextRequest(fixture)
      request.connection.send(":1\r\n$1\r\n1\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(second)), "1")
      assert.isTrue(connection.isOpen())
    }))

  it.effect("times out a transmitted command without losing reply order", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture, { commandTimeout: "1 second" })
      const first = yield* connection.execute(["INCR", "counter"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* nextRequest(fixture)
      yield* TestClock.adjust("1 second")
      const error = failure(yield* Fiber.join(first))
      assert.strictEqual(error.reason, "Timeout")
      assert.strictEqual(error.outcome, "Unknown")
      const second = yield* connection.execute(["GET", "counter"]).pipe(Effect.forkChild)
      yield* nextRequest(fixture)
      request.connection.send(":1\r\n$1\r\n1\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(second)), "1")
    }))

  it.live("routes RESP3 pushes apart from command replies", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pushes: Array<unknown> = []
      connection.onPush((reply) => pushes.push(Protocol.toValue(reply)))
      const pending = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      const request = yield* nextRequest(fixture)
      request.connection.send(">2\r\n+invalidate\r\n*1\r\n$3\r\nkey\r\n+PONG\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(pending)), "PONG")
      assert.deepStrictEqual(pushes, [["invalidate", ["key"]]])
    }))

  it.live("separates RESP2 subscription messages from replies", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const messages: Array<unknown> = []
      connection.onPush((reply) => messages.push(Protocol.toValue(reply)))
      const subscribing = yield* connection.execute(["SUBSCRIBE", "channel"]).pipe(Effect.forkChild)
      const request = yield* nextRequest(fixture)
      request.connection.send("*3\r\n$9\r\nsubscribe\r\n$7\r\nchannel\r\n:1\r\n")
      yield* Fiber.join(subscribing)
      const ping = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      yield* nextRequest(fixture)
      request.connection.send(Buffer.concat([array("message", "channel", "payload"), array("pong", "")]))
      assert.deepStrictEqual(Protocol.toValue(yield* Fiber.join(ping)), ["pong", ""])
      assert.deepStrictEqual(messages, [["subscribe", "channel", 1], ["message", "channel", "payload"]])
    }))

  it.live("leaves RESP2 subscription mode after the last channel is unsubscribed", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const roundTrip = Effect.fnUntraced(function*(args: ReadonlyArray<string>, wire: string | Uint8Array) {
        const pending = yield* connection.execute(args).pipe(Effect.forkChild)
        const request = yield* nextRequest(fixture)
        assert.deepStrictEqual(request.args.map(String), args)
        request.connection.send(wire)
        return Protocol.toValue(yield* Fiber.join(pending).pipe(Effect.timeout("2 seconds")))
      })
      yield* roundTrip(["SUBSCRIBE", "channel"], "*3\r\n$9\r\nsubscribe\r\n$7\r\nchannel\r\n:1\r\n")
      yield* roundTrip(["UNSUBSCRIBE", "channel"], "*3\r\n$11\r\nunsubscribe\r\n$7\r\nchannel\r\n:0\r\n")
      assert.deepStrictEqual(yield* roundTrip(["MGET", "a", "b"], array("message", "value")), ["message", "value"])
      assert.strictEqual(yield* roundTrip(["PING"], "+PONG\r\n"), "PONG")
    }))

  it.live("retains RESP3 attributes on replies", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pending = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      const request = yield* nextRequest(fixture)
      request.connection.send("|1\r\n+ttl\r\n:10\r\n+PONG\r\n")
      assert.deepStrictEqual(yield* Fiber.join(pending), {
        _tag: "Attribute",
        entries: [[{ _tag: "SimpleString", value: "ttl" }, { _tag: "Integer", value: 10n }]],
        value: { _tag: "SimpleString", value: "PONG" }
      })
    }))

  it.live("fails pending commands and closes the socket when the scope closes", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const scope = yield* Scope.make()
      const connection = yield* Connection.make(makeConnector(), fixture).pipe(Scope.provide(scope))
      const pending = yield* connection.execute(["BLPOP", "queue", "0"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* nextRequest(fixture)
      const closed = new Promise<void>((resolve) => request.connection.socket.once("close", () => resolve()))
      yield* Scope.close(scope, Exit.void)
      const error = failure(yield* Fiber.join(pending))
      assert.strictEqual(error.reason, "Closed")
      assert.strictEqual(error.outcome, "Unknown")
      yield* Effect.promise(() => closed).pipe(Effect.timeout("2 seconds"))
      assert.isTrue(request.connection.socket.destroyed)
      assert.isFalse(connection.isOpen())
    }))
})
