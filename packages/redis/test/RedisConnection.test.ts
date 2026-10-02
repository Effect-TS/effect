import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Connection from "@effect/redis/RedisConnection"
import type { RedisError } from "@effect/redis/RedisError"
import * as Protocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scope } from "effect"
import type * as Result from "effect/Result"
import * as TestClock from "effect/testing/TestClock"
import { array, bulk, type ScriptedRedis, startScriptedRedis } from "./utils/redis-scripted.ts"

const server = Effect.acquireRelease(
  Effect.promise(() => startScriptedRedis()),
  (server) => Effect.promise(() => server.stop())
)

const nextRequest = (fixture: ScriptedRedis) => Effect.promise(fixture.nextRequest)

const roundTrip = Effect.fnUntraced(function*(
  fixture: ScriptedRedis,
  connection: Connection.RedisConnection,
  args: ReadonlyArray<string>,
  wire: string | Uint8Array
) {
  const pending = yield* connection.execute(args).pipe(Effect.forkChild)
  const request = yield* nextRequest(fixture)
  assert.deepStrictEqual(request.args.map(String), args)
  request.connection.send(wire)
  return yield* Fiber.join(pending).pipe(Effect.timeout("2 seconds"))
})

const wrapWrite = (
  write: (bytes: string | Uint8Array, next: Effect.Effect<void, RedisError>) => Effect.Effect<void, RedisError>
): Connection.Connector =>
(endpoint) =>
  makeConnector()(endpoint).pipe(
    Effect.map((transport) => ({ ...transport, write: (bytes) => write(bytes, transport.write(bytes)) }))
  )

const failure = <A>(result: Result.Result<A, RedisError>): RedisError => {
  if (result._tag !== "Failure") return assert.fail("Expected Redis failure")
  return result.failure
}

describe("RedisConnection", () => {
  it.effect("writes idle commands immediately", () =>
    Effect.gen(function*() {
      const parser = Protocol.makeParser()
      const requests: Array<Array<string>> = []
      const nextReply = yield* Deferred.make<Protocol.Reply, RedisError>()
      let receive: ((bytes: Uint8Array) => void) | undefined
      const connection = yield* Connection.make(
        () =>
          Effect.succeed({
            run: (onBytes) =>
              Effect.callback<never>(() => {
                receive = onBytes
                return Effect.sync(() => {
                  receive = undefined
                })
              }),
            close: Effect.void,
            write: (bytes) =>
              Effect.sync(() => {
                const responses = parser.push(typeof bytes === "string" ? Buffer.from(bytes) : bytes).map((reply) => {
                  const args = Protocol.toValue(reply) as Array<string>
                  requests.push(args)
                  return bulk(args[1])
                })
                receive!(Buffer.concat(responses))
              })
          }),
        { host: "unused", port: 6379 }
      )
      yield* Effect.yieldNow
      let returned = false
      let completedBeforeReturn = false
      const withdraw = connection.submitUnsafe(["ECHO", "first"], (result) => {
        assert.strictEqual(result._tag, "Success")
        if (result._tag !== "Success") return
        assert.strictEqual(Protocol.toValue(result.success), "first")
        completedBeforeReturn = !returned
        connection.submitUnsafe(["ECHO", "reentrant"], (result) => {
          Deferred.doneUnsafe(nextReply, Effect.fromResult(result))
        })
      })
      returned = true
      assert.isTrue(completedBeforeReturn)
      assert.deepStrictEqual(requests, [["ECHO", "first"]])
      withdraw()
      assert.strictEqual(Protocol.toValue(yield* Deferred.await(nextReply)), "reentrant")
      const pipeline = connection.pipeline([
        { arguments: ["ECHO", "a"] },
        { arguments: ["ECHO", "b"] }
      ])
      for (let iteration = 0; iteration < 2; iteration++) {
        const results = yield* pipeline
        assert.deepStrictEqual(
          results.map((result) => {
            assert.strictEqual(result._tag, "Success")
            return result._tag === "Success" ? Protocol.toValue(result.success) : undefined
          }),
          ["a", "b"]
        )
      }
      assert.deepStrictEqual(requests, [
        ["ECHO", "first"],
        ["ECHO", "reentrant"],
        ["ECHO", "a"],
        ["ECHO", "b"],
        ["ECHO", "a"],
        ["ECHO", "b"]
      ])
    }))

  it.effect("keeps coalesced replies in order with synchronous transports", () =>
    Effect.gen(function*() {
      const parser = Protocol.makeParser()
      const requests: Array<string> = []
      const first = yield* Deferred.make<Protocol.Reply, RedisError>()
      const second = yield* Deferred.make<Protocol.Reply, RedisError>()
      const third = yield* Deferred.make<Protocol.Reply, RedisError>()
      let receive: ((bytes: Uint8Array) => void) | undefined
      const connection = yield* Connection.make(
        () =>
          Effect.succeed({
            run: (onBytes) =>
              Effect.callback<never>(() => {
                receive = onBytes
                return Effect.sync(() => {
                  receive = undefined
                })
              }),
            close: Effect.void,
            write: (bytes) =>
              Effect.sync(() => {
                for (const reply of parser.push(typeof bytes === "string" ? Buffer.from(bytes) : bytes)) {
                  const args = Protocol.toValue(reply) as Array<string>
                  requests.push(args[1])
                  if (args[1] === "third") receive!(bulk("third"))
                }
              })
          }),
        { host: "unused", port: 6379 }
      )
      yield* Effect.yieldNow
      connection.submitUnsafe(["ECHO", "first"], (result) => {
        Deferred.doneUnsafe(first, Effect.fromResult(result))
        connection.submitUnsafe(["ECHO", "third"], (result) => {
          Deferred.doneUnsafe(third, Effect.fromResult(result))
        })
      })
      connection.submitUnsafe(["ECHO", "second"], (result) => {
        Deferred.doneUnsafe(second, Effect.fromResult(result))
      })
      yield* Effect.yieldNow
      yield* Effect.yieldNow
      assert.deepStrictEqual(requests, ["first", "second"])
      receive!(Buffer.concat([bulk("first"), bulk("second")]))
      const replies = yield* Effect.forEach([first, second, third], Deferred.await)
      assert.deepStrictEqual(replies.map(Protocol.toValue), ["first", "second", "third"])
      assert.deepStrictEqual(requests, ["first", "second", "third"])
    }))

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
          [{ commandTimeout: -1 }, "Timeout"],
          [{ maxPendingCommands: 0 }, "Capacity"]
        ] as const
      ) {
        const error = failure(yield* Effect.result(Connection.make(connector, { host: "unused", port: 6379 }, config)))
        assert.strictEqual(error.reason, reason)
        assert.strictEqual(error.outcome, "NotSent")
      }
      assert.strictEqual(opens, 0)
    }))

  it.live("rejects commands beyond the queue limits without sending them", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture, { maxPendingCommands: 1, maxQueuedBytes: 32 })
      const oversized = failure(yield* Effect.result(connection.execute(["SET", "key", "x".repeat(32)])))
      assert.strictEqual(oversized.reason, "Capacity")
      assert.strictEqual(oversized.outcome, "NotSent")
      const first = yield* connection.execute(["GET", "first"]).pipe(Effect.forkChild)
      const request = yield* nextRequest(fixture)
      assert.deepStrictEqual(request.args.map(String), ["GET", "first"])
      const excess = failure(yield* Effect.result(connection.execute(["GET", "rejected"])))
      assert.strictEqual(excess.reason, "Capacity")
      assert.strictEqual(excess.outcome, "NotSent")
      request.connection.send(bulk("first"))
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(first)), "first")
      assert.strictEqual(Protocol.toValue(yield* roundTrip(fixture, connection, ["GET", "next"], bulk("next"))), "next")
    }))

  it.live("frames an unpaired surrogate argument so the next command still parses", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const echo = yield* connection.execute(["ECHO", "\ud800"]).pipe(Effect.forkChild)
      // A short bulk payload leaves the server waiting for the declared bytes.
      const request = yield* nextRequest(fixture).pipe(Effect.timeout("1 second"))
      assert.deepStrictEqual(request.args.map(String), ["ECHO", "�"])
      request.connection.send(bulk("�"))
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(echo)), "�")
      assert.strictEqual(Protocol.toValue(yield* roundTrip(fixture, connection, ["PING"], "+PONG\r\n")), "PONG")
    }))

  it.live("batches commands admitted during a held write in FIFO order and skips interrupted ones", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const gate = yield* Deferred.make<void>()
      const started = yield* Deferred.make<void>()
      const writes: Array<string> = []
      let active = 0
      let overlapped = false
      const connector = wrapWrite((bytes, next) =>
        Effect.gen(function*() {
          overlapped ||= active > 0
          active++
          writes.push(String(bytes))
          if (writes.length === 1) {
            yield* Deferred.succeed(started, undefined)
            yield* Deferred.await(gate)
          }
          yield* next
          active--
        })
      )
      const connection = yield* Connection.make(connector, fixture)
      const first = yield* connection.execute(["ECHO", "a"]).pipe(Effect.forkChild)
      yield* Deferred.await(started)
      const second = yield* connection.execute(["ECHO", "b"]).pipe(Effect.forkChild)
      const interrupted = yield* connection.execute(["ECHO", "c"]).pipe(Effect.forkChild)
      const third = yield* connection.execute(["ECHO", "d"]).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Fiber.interrupt(interrupted)
      assert.strictEqual(writes.length, 1)
      yield* Deferred.succeed(gate, undefined)
      const requests = yield* Effect.forEach([0, 1, 2], () => nextRequest(fixture))
      assert.deepStrictEqual(requests.map((request) => request.args.map(String)), [
        ["ECHO", "a"],
        ["ECHO", "b"],
        ["ECHO", "d"]
      ])
      requests[0].connection.send(Buffer.concat([bulk("a"), bulk("b"), bulk("d")]))
      const replies = yield* Effect.forEach([first, second, third], Fiber.join)
      assert.deepStrictEqual(replies.map(Protocol.toValue), ["a", "b", "d"])
      assert.strictEqual(writes.length, 2)
      assert.isFalse(overlapped)
    }))

  it.live("writes a pipeline in one batch and keeps the connection open after a server error", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      let writes = 0
      const connector = wrapWrite((_, next) =>
        Effect.sync(() => {
          writes++
        }).pipe(Effect.andThen(next))
      )
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
      const error = failure(results[1])
      assert.strictEqual(error.reason, "Server")
      assert.strictEqual(error.code, "WRONGTYPE")
      assert.deepStrictEqual(results[2]._tag === "Success" && Protocol.toValue(results[2].success), "value")
      assert.isTrue(connection.isOpen())
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

  it.live("routes RESP3 pushes to listeners and attributed replies to commands", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pushes: Array<unknown> = []
      connection.onPush((reply) => pushes.push(Protocol.toValue(reply)))
      const reply = yield* roundTrip(
        fixture,
        connection,
        ["PING"],
        ">2\r\n+invalidate\r\n*1\r\n$3\r\nkey\r\n|1\r\n+ttl\r\n:10\r\n+PONG\r\n"
      )
      assert.deepStrictEqual(reply, {
        _tag: "Attribute",
        entries: [[{ _tag: "SimpleString", value: "ttl" }, { _tag: "Integer", value: 10n }]],
        value: { _tag: "SimpleString", value: "PONG" }
      })
      assert.deepStrictEqual(pushes, [["invalidate", ["key"]]])
    }))

  it.live("routes RESP2 subscription messages until the last channel is unsubscribed", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const messages: Array<unknown> = []
      connection.onPush((reply) => messages.push(Protocol.toValue(reply)))
      const roundTripValue = (args: ReadonlyArray<string>, wire: string | Uint8Array) =>
        roundTrip(fixture, connection, args, wire).pipe(Effect.map(Protocol.toValue))
      yield* roundTripValue(["SUBSCRIBE", "channel"], "*3\r\n$9\r\nsubscribe\r\n$7\r\nchannel\r\n:1\r\n")
      assert.deepStrictEqual(
        yield* roundTripValue(["PING"], Buffer.concat([array("message", "channel", "payload"), array("pong", "")])),
        ["pong", ""]
      )
      yield* roundTripValue(["UNSUBSCRIBE", "channel"], "*3\r\n$11\r\nunsubscribe\r\n$7\r\nchannel\r\n:0\r\n")
      assert.deepStrictEqual(yield* roundTripValue(["MGET", "a", "b"], array("message", "value")), ["message", "value"])
      assert.strictEqual(yield* roundTripValue(["PING"], "+PONG\r\n"), "PONG")
      assert.deepStrictEqual(messages, [
        ["subscribe", "channel", 1],
        ["message", "channel", "payload"],
        ["unsubscribe", "channel", 0]
      ])
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
