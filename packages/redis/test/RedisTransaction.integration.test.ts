import { makeConnector } from "@effect/platform-node/internal/redisTransport"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import * as Protocol from "@effect/redis/RedisProtocol"
import * as Transaction from "@effect/redis/RedisTransaction"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Result from "effect/Result"
import { createConnection, type Socket } from "node:net"
import { bulk, startScriptedRedis } from "./utils/redis-scripted.ts"
import { startCluster, startRedis } from "./utils/redis-server.ts"

const redis = Effect.acquireRelease(Effect.promise(() => startRedis()), (fixture) => Effect.promise(fixture.stop))

describe("Redis transactions", () => {
  for (const protocol of [2, 3] as const) {
    it.live(`RESP${protocol}: returns EXEC errors in position while other commands complete`, () =>
      Effect.gen(function*() {
        const fixture = yield* redis
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Standalone", endpoint: fixture },
          protocol
        })
        const results = yield* Transaction.execute(
          client,
          [
            Command.set("transaction:string", "value"),
            Command.make(["LPUSH", "transaction:string", "wrong-type"], Command.integer),
            Command.get("transaction:string")
          ] as const
        )
        assert.isNotNull(results)
        if (results === null) return assert.fail("Transaction unexpectedly conflicted")
        assert.strictEqual(Result.getOrThrow(results[0]), "OK")
        assert.strictEqual(results[1]._tag, "Failure")
        if (results[1]._tag === "Failure") {
          assert.strictEqual(results[1].failure.reason, "Server")
          assert.strictEqual(results[1].failure.code, "WRONGTYPE")
        }
        assert.strictEqual(Result.getOrThrow(results[2]), "value")
        assert.strictEqual(yield* client.run(Command.get("transaction:string")), "value")
      }))
  }

  it.live("reports WATCH conflicts as null without applying queued mutations", () =>
    Effect.gen(function*() {
      const fixture = yield* redis
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      yield* client.run(Command.set("watched", "before"))
      const result = yield* Transaction.execute(
        client,
        [Command.set("watched", "transaction"), Command.set("other", "queued")] as const,
        {
          watch: (connection) =>
            Effect.gen(function*() {
              yield* connection.execute(["WATCH", "watched"])
              yield* connection.execute(["GET", "watched"])
              // The client's ordinary session is distinct from the watching reservation.
              yield* client.run(Command.set("watched", "concurrent"))
            })
        }
      )
      assert.strictEqual(result, null)
      assert.strictEqual(yield* client.run(Command.get("watched")), "concurrent")
      assert.strictEqual(yield* client.run(Command.get("other")), null)
    }))

  it.live("isolates transaction connection state from ordinary commands and later transactions", () =>
    Effect.gen(function*() {
      const fixture = yield* redis
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      yield* client.run(Command.set("transaction:database", "zero"))
      const selected = yield* Transaction.execute(client, [
        Command.make(["SELECT", "1"], Command.text),
        Command.set("transaction:database", "one"),
        Command.get("transaction:database")
      ])
      assert.isNotNull(selected)
      if (selected === null) return assert.fail("Transaction unexpectedly conflicted")
      assert.deepStrictEqual(selected.map(Result.getOrThrow), ["OK", "OK", "one"])
      assert.strictEqual(yield* client.run(Command.get("transaction:database")), "zero")
      const subsequent = yield* Transaction.execute(client, [Command.get("transaction:database")])
      assert.isNotNull(subsequent)
      if (subsequent === null) return assert.fail("Transaction unexpectedly conflicted")
      assert.deepStrictEqual(subsequent.map(Result.getOrThrow), ["zero"])
    }))

  it.live("reports queue-time rejection without applying queued mutations", () =>
    Effect.gen(function*() {
      const fixture = yield* redis
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const error = yield* Transaction.execute(
        client,
        [
          Command.set("transaction:queued", "value"),
          Command.make(["SET", "transaction:invalid"], Command.text)
        ] as const
      ).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Server")
      assert.strictEqual(error.code, "ERR")
      assert.strictEqual(yield* client.run(Command.get("transaction:queued")), null)
      assert.strictEqual(yield* client.run(Command.get("transaction:invalid")), null)
      assert.strictEqual(yield* client.run(Command.set("healthy", "value")), "OK")
    }))

  it.live("reports an uncertain transaction outcome when MULTI is denied but subsequent writes are permitted", () =>
    Effect.gen(function*() {
      const fixture = yield* redis
      yield* Effect.promise(() =>
        fixture.command("ACL", "SETUSER", "transactions-denied", "on", ">secret", "~*", "+@all", "-multi")
      )
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: fixture },
        username: "transactions-denied",
        password: "secret"
      })
      const error = yield* Transaction.execute(client, [Command.set("outside-transaction", "value")]).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Server")
      assert.strictEqual(error.code, "NOPERM")
      assert.strictEqual(error.outcome, "Unknown")
      assert.strictEqual(yield* client.run(Command.get("outside-transaction")), "value")
    }))

  it.live("retires transaction sessions when EXEC is denied", () =>
    Effect.gen(function*() {
      const fixture = yield* redis
      yield* Effect.promise(() =>
        fixture.command(
          "ACL",
          "SETUSER",
          "exec-denied",
          "on",
          ">secret",
          "~*",
          "+@all",
          "-exec"
        )
      )
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Standalone", endpoint: fixture },
        username: "exec-denied",
        password: "secret"
      })
      const error = yield* Transaction.execute(client, [Command.set("transaction:queued", "value")]).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Server")
      assert.isTrue(error.code === "NOPERM" || error.code === "EXECABORT")
      assert.strictEqual(yield* client.run(Command.get("transaction:queued")), null)
      assert.strictEqual(yield* client.run(Command.set("after-rejected-exec", "value")), "OK")
      assert.strictEqual(yield* client.run(Command.get("after-rejected-exec")), "value")
    }))

  it.live("isolates an unrecognized EXEC from ordinary commands and never reuses the transaction session", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(
        Effect.promise(() => startRedis({ config: ["rename-command EXEC \"\""] })),
        (fixture) => Effect.promise(fixture.stop)
      )
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
      const failed = yield* Transaction.execute(client, [Command.set("transaction:uncommitted", "value")])
        .pipe(Effect.flip)
      assert.strictEqual(failed.reason, "Server")
      assert.strictEqual(failed.code, "ERR")
      assert.strictEqual(yield* client.run(Command.get("transaction:uncommitted")), null)
      assert.strictEqual(yield* client.run(Command.set("ordinary:after-unknown-exec", "value")), "OK")
      assert.strictEqual(yield* client.run(Command.get("ordinary:after-unknown-exec")), "value")
      const second = yield* Transaction.execute(client, [Command.set("transaction:second", "value")]).pipe(Effect.flip)
      assert.strictEqual(second.reason, "Server")
      assert.strictEqual(second.code, "ERR")
      assert.strictEqual(yield* client.run(Command.get("transaction:second")), null)
    }))

  it.live("does not replay EXEC when Redis commits but its reply is lost", () =>
    Effect.gen(function*() {
      const fixture = yield* redis
      const upstreams = new Map<number, {
        readonly socket: Socket
        readonly parser: Protocol.Parser
        readonly commands: Array<string>
        awaitingExec: boolean
      }>()
      let execCount = 0
      const proxy = yield* Effect.acquireRelease(
        Effect.promise(() =>
          startScriptedRedis((request) => {
            let upstream = upstreams.get(request.connection.number)
            if (upstream === undefined) {
              upstream = {
                socket: createConnection(fixture),
                parser: Protocol.makeParser(),
                commands: [],
                awaitingExec: false
              }
              upstreams.set(request.connection.number, upstream)
              upstream.socket.on("error", () => request.connection.disconnect())
              upstream.socket.on("data", (data) => {
                for (const _reply of upstream!.parser.push(typeof data === "string" ? Buffer.from(data) : data)) {
                  if (upstream!.commands.shift() === "EXEC") {
                    // Wait for EXEC itself, including when Redis coalesces its
                    // reply with MULTI and QUEUED acknowledgements.
                    request.connection.disconnect()
                    upstream!.socket.destroy()
                    return
                  }
                }
                if (!upstream!.awaitingExec) request.connection.send(data)
              })
              request.connection.socket.once("close", () => upstream!.socket.destroy())
            }
            const command = request.args[0]?.toString()
            upstream.commands.push(command)
            if (command === "EXEC") {
              execCount++
              upstream.awaitingExec = true
            }
            // The server fixture already decoded the client command independently.
            const encoded = Buffer.concat([
              Buffer.from(`*${request.args.length}\r\n`),
              ...request.args.map((argument) => bulk(argument))
            ])
            upstream.socket.write(encoded)
          })
        ),
        (proxy) =>
          Effect.promise(async () => {
            for (const upstream of upstreams.values()) upstream.socket.destroy()
            await proxy.stop()
          })
      )
      const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: proxy } })
      const error = yield* Transaction.execute(
        client,
        [Command.make(["INCR", "committed-once"], Command.integer)] as const
      ).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Connection")
      assert.strictEqual(error.outcome, "Unknown")
      assert.strictEqual(execCount, 1)
      assert.strictEqual(yield* Effect.promise(() => fixture.command("GET", "committed-once")), "1")
    }))

  it.live("enforces Cluster transaction affinity before writing cross-slot commands", () =>
    Effect.gen(function*() {
      const fixture = yield* Effect.acquireRelease(Effect.promise(() => startCluster()), (fixture) =>
        Effect.promise(fixture.stop))
      const sent: Array<Uint8Array> = []
      const base = makeConnector()
      const connector: typeof base = (endpoint) =>
        base(endpoint).pipe(Effect.map((transport) => ({
          ...transport,
          write: (bytes: string | Uint8Array) =>
            Effect.sync(() => {
              sent.push(typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes.slice())
            }).pipe(Effect.andThen(transport.write(bytes)))
        })))
      const client = yield* Client.make(connector, { topology: { _tag: "Cluster", seeds: fixture.seeds } })
      const crossSlot = yield* Transaction.execute(
        client,
        [
          Command.set("{foo}:queued", "value"),
          Command.set("{bar}:must-never-be-sent", "value")
        ] as const,
        { affinity: { key: "{foo}:queued" } }
      ).pipe(Effect.flip)
      assert.strictEqual(crossSlot.reason, "Routing")
      assert.strictEqual(crossSlot.code, "CROSSSLOT")
      assert.strictEqual(crossSlot.outcome, "NotSent")
      const inferredCrossSlot = yield* Transaction.execute(client, [
        Command.set("{foo}:queued", "value"),
        Command.set("{bar}:must-never-be-sent", "value")
      ]).pipe(Effect.flip)
      assert.strictEqual(inferredCrossSlot.code, "CROSSSLOT")
      assert.strictEqual(inferredCrossSlot.outcome, "NotSent")
      const conflictingNode = yield* Transaction.execute(client, [
        Command.make(["INFO"], Command.text, { keyIndexes: [], node: fixture.seeds[0] }),
        Command.set("{foo}:must-never-be-sent", "value")
      ]).pipe(Effect.flip)
      assert.strictEqual(conflictingNode.code, "CROSSSLOT")
      assert.strictEqual(conflictingNode.outcome, "NotSent")
      assert.isFalse(sent.some((bytes) =>
        new TextDecoder().decode(bytes).includes("{bar}:must-never-be-sent")
      ))
      assert.isFalse(sent.some((bytes) => new TextDecoder().decode(bytes).includes("MULTI")))
      assert.strictEqual(yield* client.run(Command.get("{foo}:queued")), null)
      const results = yield* Transaction.execute(
        client,
        [
          Command.set("{foo}:object", "value"),
          Command.make(["OBJECT", "ENCODING", "{foo}:object"], Command.text, { keyIndexes: [2] })
        ] as const,
        { affinity: { key: "{foo}:object" } }
      )
      assert.isNotNull(results)
      if (results === null) return assert.fail("Transaction unexpectedly conflicted")
      assert.strictEqual(Result.getOrThrow(results[0]), "OK")
      assert.strictEqual(Result.getOrThrow(results[1]), "embstr")
      const inferred = yield* Transaction.execute(client, [Command.get("{foo}:object")])
      assert.isNotNull(inferred)
      if (inferred === null) return assert.fail("Transaction unexpectedly conflicted")
      assert.deepStrictEqual(inferred.map(Result.getOrThrow), ["value"])
    }), 90_000)
})
