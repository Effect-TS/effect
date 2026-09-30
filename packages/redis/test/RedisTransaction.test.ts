import { makeConnector } from "@effect/platform-node/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Transaction from "@effect/redis/RedisTransaction"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Result from "effect/Result"
import { startScriptedRedis } from "./utils/redis-scripted.ts"

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
