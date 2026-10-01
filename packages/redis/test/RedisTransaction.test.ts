import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Transaction from "@effect/redis/RedisTransaction"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Scope } from "effect"
import * as Result from "effect/Result"
import type { Socket } from "node:net"
import { barrier, type Request, startScriptedRedis } from "./utils/redis-scripted.ts"

const serve = (handle: (request: Request, command: string) => void) =>
  Effect.acquireRelease(
    Effect.promise(() =>
      startScriptedRedis((request) => {
        const command = request.args[0].toString()
        if (command === "PING") request.connection.send("+PONG\r\n")
        else handle(request, command)
      })
    ),
    (fixture) => Effect.promise(fixture.stop)
  )

const ping = Command.make(["PING"], Command.text)
const incr = (key: string) => Command.make(["INCR", key], Command.integer)

const onClose = (socket: Socket): Effect.Effect<void> => {
  const closed = new Promise<void>((resolve) => socket.destroyed ? resolve() : socket.once("close", () => resolve()))
  return Effect.promise(() => closed)
}

describe("RedisTransaction", () => {
  it.live("submits MULTI, commands and EXEC before waiting for acknowledgements", () =>
    Effect.gen(function*() {
      const submitted: Array<ReadonlyArray<string>> = []
      const fixture = yield* serve((request, command) => {
        submitted.push(request.args.map(String))
        if (command === "EXEC") request.connection.send("+OK\r\n+QUEUED\r\n+QUEUED\r\n*2\r\n+OK\r\n$5\r\nvalue\r\n")
      })
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const results = yield* Transaction.execute(client, [Command.set("key", "value"), Command.get("key")])
      assert.deepStrictEqual(results?.map(Result.getOrThrow), ["OK", "value"])
      assert.deepStrictEqual(submitted, [["MULTI"], ["SET", "key", "value"], ["GET", "key"], ["EXEC"]])
    }))

  it.live("runs concurrent transactions on separate sessions from ordinary commands", () =>
    Effect.gen(function*() {
      const executing: Array<Request> = []
      const bothExecuting = barrier<void>()
      const fixture = yield* serve((request, command) => {
        if (command === "EXEC" && executing.push(request) === 2) bothExecuting.resolve()
      })
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const pending = yield* Effect.all([
        Transaction.execute(client, [incr("a")]),
        Transaction.execute(client, [incr("b")])
      ], { concurrency: "unbounded" }).pipe(Effect.forkChild)
      yield* Effect.promise(() => bothExecuting.promise)
      assert.strictEqual(yield* client.run(ping), "PONG")
      const sessions = executing.map((request) => request.connection.number)
      assert.notStrictEqual(sessions[0], sessions[1])
      assert.notInclude(sessions, 0)
      for (const request of executing) request.connection.send("+OK\r\n+QUEUED\r\n*1\r\n:1\r\n")
      const results = yield* Fiber.join(pending)
      assert.deepStrictEqual(results.map((result) => result?.map(Result.getOrThrow)), [[1n], [1n]])
    }))

  it.live("retires a session after an invalid acknowledgement with an unknown outcome", () =>
    Effect.gen(function*() {
      let executions = 0
      const fixture = yield* serve((request, command) => {
        if (command !== "EXEC") return
        request.connection.send(
          ++executions === 1 ? "+OK\r\n+UNEXPECTED\r\n*1\r\n:1\r\n" : "+OK\r\n+QUEUED\r\n*1\r\n:1\r\n"
        )
      })
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const error = yield* Transaction.execute(client, [incr("counter")]).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Protocol")
      assert.strictEqual(error.outcome, "Unknown")
      const result = yield* Transaction.execute(client, [incr("counter")])
      assert.deepStrictEqual(result?.map(Result.getOrThrow), [1n])
      assert.strictEqual(fixture.connections.length, 3)
      assert.isTrue(fixture.connections[1].socket.destroyed)
    }))

  it.live("does not replay EXEC when its reply is lost", () =>
    Effect.gen(function*() {
      let executions = 0
      const fixture = yield* serve((request, command) => {
        if (command !== "EXEC") return
        if (++executions === 1) request.connection.disconnect()
        else request.connection.send("+OK\r\n+QUEUED\r\n*1\r\n:1\r\n")
      })
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const error = yield* Transaction.execute(client, [incr("counter")]).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Connection")
      assert.strictEqual(error.outcome, "Unknown")
      assert.strictEqual(executions, 1)
    }))

  it.live("closes the session when interrupted without affecting ordinary commands", () =>
    Effect.gen(function*() {
      const executing = barrier<Request>()
      const fixture = yield* serve((request, command) => {
        if (command === "EXEC") executing.resolve(request)
      })
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const transaction = yield* Transaction.execute(client, [incr("counter")]).pipe(Effect.forkChild)
      const exec = yield* Effect.promise(() => executing.promise)
      const sessionClosed = onClose(exec.connection.socket)
      yield* Fiber.interrupt(transaction)
      yield* sessionClosed.pipe(Effect.timeout("2 seconds"))
      assert.strictEqual(yield* client.run(ping), "PONG")
    }))

  it.live("closes idle and leased sessions when the client scope ends", () =>
    Effect.gen(function*() {
      let executions = 0
      const leased = barrier<void>()
      const fixture = yield* serve((request, command) => {
        if (command !== "EXEC") return
        if (++executions === 1) request.connection.send("+OK\r\n+QUEUED\r\n*1\r\n:1\r\n")
        else leased.resolve()
      })
      const scope = yield* Scope.make()
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: fixture }
      }).pipe(Scope.provide(scope))
      yield* Transaction.execute(client, [incr("idle")])
      const pending = yield* Transaction.execute(client, [incr("leased")]).pipe(Effect.result, Effect.forkChild)
      yield* Effect.promise(() => leased.promise)
      const allClosed = Effect.all(fixture.connections.map((connection) => onClose(connection.socket)))
      yield* Scope.close(scope, Exit.void)
      yield* allClosed.pipe(Effect.timeout("2 seconds"))
      assert.strictEqual((yield* Fiber.join(pending))._tag, "Failure")
      assert.strictEqual((yield* Effect.result(Transaction.execute(client, [incr("closed")])))._tag, "Failure")
    }))

  it.live("rejects transaction control commands without sending anything", () =>
    Effect.gen(function*() {
      const requests: Array<string> = []
      const fixture = yield* serve((_, command) => requests.push(command))
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      for (const control of ["MULTI", "exec", "DISCARD", "WATCH", "UNWATCH", "RESET", "QUIT"]) {
        const error = yield* Transaction.execute(client, [
          Command.set("key", "queued"),
          Command.make([control], Command.text)
        ]).pipe(Effect.flip)
        assert.strictEqual(error.reason, "Routing")
        assert.strictEqual(error.outcome, "NotSent")
      }
      assert.deepStrictEqual(requests, [])
      assert.strictEqual(fixture.connections.length, 1)
    }))

  it.live("unwraps RESP3 attributes around EXEC results", () =>
    Effect.gen(function*() {
      const fixture = yield* serve((request, command) => {
        if (command === "HELLO") request.connection.send("%0\r\n")
        if (command === "EXEC") {
          request.connection.send(
            "+OK\r\n+QUEUED\r\n+QUEUED\r\n|0\r\n*2\r\n|0\r\n-WRONGTYPE invalid value\r\n|0\r\n+OK\r\n"
          )
        }
      })
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: fixture },
        protocol: 3
      })
      const results = yield* Transaction.execute(client, [
        Command.make(["LPUSH", "key", "value"], Command.integer),
        Command.set("key", "value")
      ])
      assert.isNotNull(results)
      if (results === null) return
      assert.strictEqual(results[0]._tag, "Failure")
      if (results[0]._tag === "Failure") assert.strictEqual(results[0].failure.code, "WRONGTYPE")
      assert.strictEqual(Result.getOrThrow(results[1]), "OK")
    }))
})
