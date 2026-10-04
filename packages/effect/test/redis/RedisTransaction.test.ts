import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Scope } from "effect"
import * as Client from "effect/redis/RedisClient"
import * as Command from "effect/redis/RedisCommand"
import * as Transaction from "effect/redis/RedisTransaction"
import * as Result from "effect/Result"
import { makeConnector } from "./utils/redis-connector.ts"
import { barrier, bulk, type Request, type ScriptedRedis, startScriptedRedis } from "./utils/redis-scripted.ts"

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

const standalone = (handle: (request: Request, command: string) => void) =>
  Effect.gen(function*() {
    const fixture = yield* serve(handle)
    const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
    return { fixture, client }
  })

const ping = Command.make(["PING"], Command.text)
const incr = (key: string) => Command.make(["INCR", key], Command.integer)

// Two Cluster primaries: slots 0-8191 on `low` ({bar} = 5061), 8192-16383 on `high` ({foo} = 12182).
const twoPrimaries = Effect.gen(function*() {
  const commands = { low: [] as Array<string>, high: [] as Array<string> }
  let slots: Buffer | undefined
  const node = (name: keyof typeof commands) =>
    serve((request, command) => {
      if (command === "CLUSTER") {
        request.connection.send(request.args[1].toString() === "SLOTS" ? slots! : "-ERR unknown subcommand\r\n")
        return
      }
      commands[name].push(command)
      if (command === "EXEC") request.connection.send("+OK\r\n+QUEUED\r\n+QUEUED\r\n*2\r\n+OK\r\n+OK\r\n")
    })
  const low = yield* node("low")
  const high = yield* node("high")
  const range = (start: number, end: number, owner: ScriptedRedis) =>
    Buffer.concat([
      Buffer.from(`*3\r\n:${start}\r\n:${end}\r\n*2\r\n`),
      bulk(owner.host),
      Buffer.from(`:${owner.port}\r\n`)
    ])
  slots = Buffer.concat([Buffer.from("*2\r\n"), range(0, 8191, low), range(8192, 16383, high)])
  const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [low] } })
  return { client, commands }
})

describe("RedisTransaction", () => {
  it.live("runs a Cluster transaction on the node owning its first key's slot", () =>
    Effect.gen(function*() {
      const { client, commands } = yield* twoPrimaries
      const results = yield* Transaction.execute(client, [Command.set("{foo}:a", "1"), Command.set("{foo}:b", "2")])
      assert.deepStrictEqual(results?.map(Result.getOrThrow), ["OK", "OK"])
      assert.deepStrictEqual(commands, { low: [], high: ["MULTI", "SET", "SET", "EXEC"] })
    }))

  it.live("rejects a cross-slot Cluster transaction before sending it", () =>
    Effect.gen(function*() {
      const { client, commands } = yield* twoPrimaries
      const error = yield* Transaction.execute(client, [Command.set("{foo}:a", "1"), Command.set("{bar}:b", "2")])
        .pipe(Effect.flip)
      assert.strictEqual(error.code, "CROSSSLOT")
      assert.strictEqual(error.outcome, "NotSent")
      assert.deepStrictEqual(commands, { low: [], high: [] })
    }))

  it.live("submits MULTI, commands and EXEC before waiting for acknowledgements", () =>
    Effect.gen(function*() {
      const submitted: Array<ReadonlyArray<string>> = []
      const { client } = yield* standalone((request, command) => {
        submitted.push(request.args.map(String))
        if (command === "EXEC") request.connection.send("+OK\r\n+QUEUED\r\n+QUEUED\r\n*2\r\n+OK\r\n$5\r\nvalue\r\n")
      })
      const results = yield* Transaction.execute(client, [Command.set("key", "value"), Command.get("key")])
      assert.deepStrictEqual(results?.map(Result.getOrThrow), ["OK", "value"])
      assert.deepStrictEqual(submitted, [["MULTI"], ["SET", "key", "value"], ["GET", "key"], ["EXEC"]])
    }))

  it.live("runs concurrent transactions on separate sessions from ordinary commands", () =>
    Effect.gen(function*() {
      const executing: Array<Request> = []
      const bothExecuting = barrier<void>()
      const { client } = yield* standalone((request, command) => {
        if (command === "EXEC" && executing.push(request) === 2) bothExecuting.resolve()
      })
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
      const { fixture, client } = yield* standalone((request, command) => {
        if (command !== "EXEC") return
        request.connection.send(
          ++executions === 1 ? "+OK\r\n+UNEXPECTED\r\n*1\r\n:1\r\n" : "+OK\r\n+QUEUED\r\n*1\r\n:1\r\n"
        )
      })
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
      const { client } = yield* standalone((request, command) => {
        if (command !== "EXEC") return
        if (++executions === 1) request.connection.disconnect()
        else request.connection.send("+OK\r\n+QUEUED\r\n*1\r\n:1\r\n")
      })
      const error = yield* Transaction.execute(client, [incr("counter")]).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Connection")
      assert.strictEqual(error.outcome, "Unknown")
      assert.strictEqual(executions, 1)
    }))

  it.live("closes the session when interrupted without affecting ordinary commands", () =>
    Effect.gen(function*() {
      const executing = barrier<Request>()
      const { client } = yield* standalone((request, command) => {
        if (command === "EXEC") executing.resolve(request)
      })
      const transaction = yield* Transaction.execute(client, [incr("counter")]).pipe(Effect.forkChild)
      const exec = yield* Effect.promise(() => executing.promise)
      yield* Fiber.interrupt(transaction)
      yield* Effect.promise(() => exec.connection.closed).pipe(Effect.timeout("2 seconds"))
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
      yield* Scope.close(scope, Exit.void)
      yield* Effect.promise(() => Promise.all(fixture.connections.map((connection) => connection.closed)))
        .pipe(Effect.timeout("2 seconds"))
      assert.strictEqual((yield* Fiber.join(pending))._tag, "Failure")
      assert.strictEqual((yield* Effect.result(Transaction.execute(client, [incr("closed")])))._tag, "Failure")
    }))

  it.live("rejects transaction control commands without sending anything", () =>
    Effect.gen(function*() {
      const requests: Array<string> = []
      const { fixture, client } = yield* standalone((_, command) => requests.push(command))
      for (const control of ["WATCH", "exec"]) {
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
      if (results === null) return assert.fail("Transaction unexpectedly conflicted")
      assert.isTrue(Result.isFailure(results[0]) && results[0].failure.code === "WRONGTYPE")
      assert.strictEqual(Result.getOrThrow(results[1]), "OK")
    }))
})
