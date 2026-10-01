import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Transaction from "@effect/redis/RedisTransaction"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Scope } from "effect"
import * as Result from "effect/Result"
import { barrier, type Connection, startScriptedRedis } from "./utils/redis-scripted.ts"

describe("Redis transactions", () => {
  it.live("submits the whole transaction before waiting for acknowledgements", () =>
    Effect.gen(function*() {
      const submitted: Array<ReadonlyArray<string>> = []
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            const args = request.args.map((argument) => argument.toString())
            if (args[0] === "PING") {
              request.connection.send("+PONG\r\n")
              return
            }
            submitted.push(args)
            if (args[0] === "EXEC") {
              request.connection.send("+OK\r\n+QUEUED\r\n+QUEUED\r\n*2\r\n+OK\r\n$5\r\nvalue\r\n")
            }
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const results = yield* Transaction.execute(client, [Command.set("key", "value"), Command.get("key")])
      assert.isNotNull(results)
      if (results === null) return assert.fail("Transaction unexpectedly conflicted")
      assert.deepStrictEqual(results.map(Result.getOrThrow), ["OK", "value"])
      assert.deepStrictEqual(submitted, [["MULTI"], ["SET", "key", "value"], ["GET", "key"], ["EXEC"]])
      yield* Transaction.execute(client, [Command.set("key", "value"), Command.get("key")])
      assert.strictEqual(fixture.connections.length, 2)
      assert.strictEqual(submitted.length, 8)
    }))

  it.live("leases concurrent transaction sessions independently and bounds idle retention", () =>
    Effect.gen(function*() {
      const requests: Array<string> = []
      const active = new Map<number, number>()
      const completed: Array<{ readonly connection: Connection; readonly value: number }> = []
      const executing = barrier<void>()
      const retired = barrier<void>()
      let closures = 0
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            const command = request.args[0].toString()
            requests.push(command)
            switch (command) {
              case "MULTI":
                assert.isFalse(active.has(request.connection.number))
                request.connection.socket.once("close", () => {
                  if (++closures === 4) retired.resolve()
                })
                active.set(request.connection.number, 0)
                request.connection.send("+OK\r\n")
                break
              case "INCR":
                assert.isTrue(active.has(request.connection.number))
                active.set(request.connection.number, Number(request.args[1].toString()))
                request.connection.send("+QUEUED\r\n")
                break
              case "EXEC":
                assert.isTrue(active.has(request.connection.number))
                completed.push({
                  connection: request.connection,
                  value: active.get(request.connection.number) ?? assert.fail("Transaction session lost its state")
                })
                active.delete(request.connection.number)
                if (completed.length === 20) executing.resolve()
                break
              case "PING":
                assert.isFalse(active.has(request.connection.number))
                request.connection.send("+PONG\r\n")
            }
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const pending = yield* Effect.forEach(
        Array.from({ length: 20 }, (_, index) => index),
        (index) => Transaction.execute(client, [Command.make(["INCR", String(index)], Command.integer)]),
        {
          concurrency: "unbounded"
        }
      ).pipe(Effect.forkChild)
      yield* Effect.promise(() => executing.promise)
      assert.strictEqual(yield* client.run(Command.make(["PING"], Command.text)), "PONG")
      for (const { connection, value } of completed) connection.send(`*1\r\n:${value}\r\n`)
      const transactions = yield* Fiber.join(pending)
      assert.deepStrictEqual(
        transactions.map((results) => results?.map(Result.getOrThrow)),
        Array.from({ length: 20 }, (_, index) => [BigInt(index)])
      )
      assert.strictEqual(
        requests.filter((command) => command === "MULTI").length,
        20
      )
      assert.strictEqual(fixture.connections.length, 21)
      yield* Effect.promise(() => retired.promise)
      assert.strictEqual(fixture.connections.filter((connection) => !connection.socket.destroyed).length, 17)
    }))

  it.live("retires sessions with invalid acknowledgements and preserves uncertain EXEC failures", () =>
    Effect.gen(function*() {
      for (const scenario of ["multi", "queued", "exec", "lost-exec"] as const) {
        let executions = 0
        const fixture = yield* Effect.acquireRelease(
          Effect.promise(() =>
            startScriptedRedis((request) => {
              const command = request.args[0].toString()
              if (command === "PING") request.connection.send("+PONG\r\n")
              if (command !== "EXEC") return
              if (++executions > 1) {
                request.connection.send("+OK\r\n+QUEUED\r\n*1\r\n:1\r\n")
              } else if (scenario === "lost-exec") {
                request.connection.socket.end("-ERR MULTI rejected\r\n+QUEUED\r\n")
              } else {
                request.connection.send(
                  scenario === "multi" ?
                    "+UNEXPECTED\r\n+QUEUED\r\n*1\r\n:1\r\n" :
                    scenario === "queued" ?
                    "+OK\r\n+UNEXPECTED\r\n*1\r\n:1\r\n" :
                    "+OK\r\n+QUEUED\r\n*0\r\n"
                )
              }
            })
          ),
          (fixture) => Effect.promise(fixture.stop)
        )
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
        const operation = Transaction.execute(client, [Command.make(["INCR", "counter"], Command.integer)])
        const error = yield* operation.pipe(Effect.flip)
        assert.strictEqual(error.reason, scenario === "lost-exec" ? "Connection" : "Protocol")
        assert.strictEqual(error.outcome, "Unknown")
        assert.strictEqual(yield* client.run(Command.make(["PING"], Command.text)), "PONG")
        const result = yield* operation
        assert.deepStrictEqual(result?.map(Result.getOrThrow), [BigInt(1)])
        assert.strictEqual(fixture.connections.length, 3)
      }
    }))

  it.live("takes fresh snapshots and validates commands when a pooled transaction effect is reused", () =>
    Effect.gen(function*() {
      const values: Array<string> = []
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            const command = request.args[0].toString()
            if (command === "PING") request.connection.send("+PONG\r\n")
            if (command === "SET") values.push(request.args[2].toString())
            if (command === "EXEC") request.connection.send("+OK\r\n+QUEUED\r\n*1\r\n+OK\r\n")
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const value = Buffer.from("first")
      const args = ["SET", "key", value]
      const operation = Transaction.execute(client, [Command.make(args, Command.text)])
      yield* operation
      value.set(Buffer.from("later"))
      yield* operation
      assert.deepStrictEqual(values, ["first", "later"])
      assert.strictEqual(fixture.connections.length, 2)
      args.splice(0, args.length, "RESET")
      const error = yield* operation.pipe(Effect.flip)
      assert.strictEqual(error.reason, "Routing")
      assert.strictEqual(error.outcome, "NotSent")
      assert.deepStrictEqual(values, ["first", "later"])
    }))

  it.live("closes interrupted transaction sessions while ordinary commands keep their session", () =>
    Effect.gen(function*() {
      const executing = barrier<void>()
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            switch (request.args[0].toString()) {
              case "EXEC":
                executing.resolve()
                break
              case "PING":
                assert.strictEqual(request.connection.number, 0)
                request.connection.send("+PONG\r\n")
            }
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const transaction = yield* Transaction.execute(client, [
        Command.make(["INCR", "counter"], Command.integer)
      ]).pipe(Effect.forkChild)
      yield* Effect.promise(() => executing.promise)
      yield* Fiber.interrupt(transaction)
      assert.strictEqual(yield* client.run(Command.make(["PING"], Command.text)), "PONG")
      assert.strictEqual(fixture.connections.length, 2)
    }))

  it.live("closes both idle and leased transaction sessions when the client scope ends", () =>
    Effect.gen(function*() {
      const executing = barrier<void>()
      let transactions = 0
      let first: Connection | undefined
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            switch (request.args[0].toString()) {
              case "PING":
                request.connection.send("+PONG\r\n")
                break
              case "EXEC":
                if (++transactions === 1) first = request.connection
                else if (transactions === 2) {
                  first?.send("+OK\r\n+QUEUED\r\n*1\r\n:1\r\n")
                  request.connection.send("+OK\r\n+QUEUED\r\n*1\r\n:1\r\n")
                } else executing.resolve()
            }
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const scope = yield* Scope.make()
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: fixture }
      }).pipe(Effect.provideService(Scope.Scope, scope))
      yield* Effect.all([
        Transaction.execute(client, [Command.make(["INCR", "first"], Command.integer)]),
        Transaction.execute(client, [Command.make(["INCR", "second"], Command.integer)])
      ], { concurrency: "unbounded" })
      const pending = yield* Transaction.execute(client, [Command.make(["INCR", "leased"], Command.integer)])
        .pipe(Effect.result, Effect.forkChild)
      yield* Effect.promise(() => executing.promise)
      const closed = fixture.connections.map((connection) =>
        new Promise<void>((resolve) => {
          if (connection.socket.destroyed) resolve()
          else connection.socket.once("close", () => resolve())
        })
      )
      yield* Scope.close(scope, Exit.void)
      yield* Effect.promise(() => Promise.all(closed))
      assert.strictEqual((yield* Fiber.join(pending))._tag, "Failure")
      assert.isTrue(fixture.connections.every((connection) => connection.socket.destroyed))
      const result = yield* Transaction.execute(client, [Command.make(["INCR", "after-close"], Command.integer)])
        .pipe(Effect.result)
      assert.strictEqual(result._tag, "Failure")
    }))

  it.live("rejects an over-capacity transaction without submitting any part of it", () =>
    Effect.gen(function*() {
      const requests: Array<string> = []
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            requests.push(request.args[0].toString())
            request.connection.send("+PONG\r\n")
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: fixture },
        maxPendingCommands: 2
      })
      const error = yield* Transaction.execute(client, [Command.set("key", "value")]).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Capacity")
      assert.strictEqual(error.outcome, "NotSent")
      assert.deepStrictEqual(requests, ["PING"])
    }))

  it.live("snapshots commands before watch callbacks and session acquisition", () =>
    Effect.gen(function*() {
      const submitted: Array<ReadonlyArray<string>> = []
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            const args = request.args.map((argument) => argument.toString())
            if (args[0] === "PING") {
              request.connection.send("+PONG\r\n")
              return
            }
            submitted.push(args)
            if (args[0] === "EXEC") request.connection.send("+OK\r\n+QUEUED\r\n*1\r\n+OK\r\n")
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const value = Buffer.from("value")
      const args = ["SET", "key", value]
      const results = yield* Transaction.execute(client, [Command.make(args, Command.text)], {
        watch: () =>
          Effect.sync(() => {
            value.fill(120)
            args.splice(0, args.length, "RESET")
          })
      })
      assert.isNotNull(results)
      if (results === null) return assert.fail("Transaction unexpectedly conflicted")
      assert.deepStrictEqual(results.map(Result.getOrThrow), ["OK"])
      assert.deepStrictEqual(submitted, [["MULTI"], ["SET", "key", "value"], ["EXEC"]])
    }))

  it.live("rejects transaction control commands before acquiring a session or sending mutations", () =>
    Effect.gen(function*() {
      const requests: Array<string> = []
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            requests.push(request.args[0].toString())
            request.connection.send("+PONG\r\n")
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      for (const control of ["MULTI", "EXEC", "DISCARD", "WATCH", "UNWATCH", "RESET", "QUIT"]) {
        const error = yield* Transaction.execute(client, [
          Command.set("transaction:protected", "queued"),
          Command.make([control.toLowerCase()], Command.text),
          Command.set("transaction:protected", "outside-transaction")
        ]).pipe(Effect.flip)
        assert.strictEqual(error.reason, "Routing")
        assert.strictEqual(error.outcome, "NotSent")
      }
      assert.deepStrictEqual(requests, ["PING"])
      assert.strictEqual(fixture.connections.length, 1)
    }))

  it.live("unwraps EXEC attributes and preserves server errors wrapped in attributes", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            switch (request.args[0]?.toString()) {
              case "HELLO":
                request.connection.send("%0\r\n")
                break
              case "PING":
                request.connection.send("+PONG\r\n")
                break
              case "MULTI":
                request.connection.send("+OK\r\n")
                break
              case "EXEC":
                request.connection.send("|0\r\n*2\r\n|0\r\n-WRONGTYPE invalid value\r\n|0\r\n+OK\r\n")
                break
              default:
                request.connection.send("+QUEUED\r\n")
            }
          })
        ),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: fixture },
        protocol: 3
      })
      let observedAttributes = false
      const results = yield* Transaction.execute(client, [
        Command.make(["LPUSH", "key", "value"], Command.integer),
        Command.make(["SET", "key", "value"], (reply) => {
          observedAttributes = reply._tag === "Attribute"
          return Command.text(reply)
        })
      ])
      assert.isNotNull(results)
      if (results === null) return assert.fail("Transaction unexpectedly conflicted")
      assert.strictEqual(results[0]._tag, "Failure")
      if (results[0]._tag === "Failure") {
        assert.strictEqual(results[0].failure.reason, "Server")
        assert.strictEqual(results[0].failure.code, "WRONGTYPE")
      }
      assert.strictEqual(Result.getOrThrow(results[1]), "OK")
      assert.isTrue(observedAttributes)
    }))
})
