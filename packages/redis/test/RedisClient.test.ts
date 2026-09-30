import { makeConnector } from "@effect/platform-node/internal/redisTransport"
import * as Cluster from "@effect/redis/internal/cluster"
import * as Sentinel from "@effect/redis/internal/sentinel"
import type { ClusterConfig } from "@effect/redis/internal/topology"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import type { Connector, Endpoint } from "@effect/redis/RedisConnection"
import { RedisError } from "@effect/redis/RedisError"
import * as Protocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, Queue, Redacted, Scope } from "effect"
import type * as Result from "effect/Result"
import * as TestClock from "effect/testing/TestClock"
import { barrier, bulk, type Request, startScriptedRedis } from "./utils/redis-scripted.ts"

const server = (handle: (request: Request) => void) =>
  Effect.acquireRelease(
    Effect.promise(() => startScriptedRedis(handle)),
    (fixture) => Effect.promise(fixture.stop)
  )
const args = (request: Request): Array<string> => request.args.map((arg) => arg.toString())
const failure = <A>(result: Result.Result<A, RedisError>): RedisError => {
  assert.strictEqual(result._tag, "Failure")
  if (result._tag !== "Failure") return assert.fail("Expected Redis failure")
  return result.failure
}
const slots = (endpoint: { host: string; port: number }): Buffer =>
  Buffer.concat([
    Buffer.from("*1\r\n*3\r\n:0\r\n:16383\r\n*2\r\n"),
    bulk(endpoint.host),
    Buffer.from(`:${endpoint.port}\r\n`)
  ])
const discovery = (request: Request, endpoint: { host: string; port: number }): boolean => {
  const values = args(request)
  if (values[0] === "CLUSTER") {
    request.connection.send(values[1] === "SHARDS" ? "-ERR unknown subcommand 'SHARDS'\r\n" : slots(endpoint))
    return true
  }
  if (values[0] === "PING") {
    request.connection.send("+PONG\r\n")
    return true
  }
  return false
}

describe("RedisClient", () => {
  describe("lifecycle", () => {
    it.effect("times out initial PING and closes the acquired transport", () =>
      Effect.gen(function*() {
        const written = yield* Deferred.make<void>()
        const replies = yield* Queue.unbounded<Uint8Array, RedisError>()
        let closed = false
        const connector: Connector = () =>
          Effect.acquireRelease(
            Effect.succeed({
              read: Queue.take(replies),
              write: () => Deferred.succeed(written, undefined).pipe(Effect.asVoid),
              close: Effect.sync(() => {
                closed = true
              })
            }),
            (transport) => transport.close
          )
        const acquiring = yield* Client.make(connector).pipe(Effect.result, Effect.forkChild)
        yield* Deferred.await(written)
        yield* TestClock.adjust("10 seconds")
        const error = failure(yield* Fiber.join(acquiring))
        assert.strictEqual(error.reason, "Timeout")
        assert.strictEqual(error.outcome, "Unknown")
        assert.isTrue(closed)
      }))

    it.effect("rejects invalid reconnect delays before acquiring connections", () =>
      Effect.gen(function*() {
        let acquisitions = 0
        const connector = () =>
          Effect.sync(() => {
            acquisitions++
            return assert.fail("No connection should be acquired")
          })
        for (const reconnectDelay of [0, -1, Infinity, "invalid" as any]) {
          const error = failure(yield* Effect.result(Client.make(connector, { reconnectDelay })))
          assert.strictEqual(error.reason, "Routing")
          assert.strictEqual(error.outcome, "NotSent")
        }
        assert.strictEqual(acquisitions, 0)
      }))

    it.live("closes acquired sessions immediately when initial validation fails", () =>
      Effect.gen(function*() {
        const disconnected = barrier<void>()
        const fixture = yield* server((request) => {
          request.connection.socket.once("close", () => disconnected.resolve())
          request.connection.send("-NOPERM initial PING denied\r\n")
        })
        const error = failure(
          yield* Effect.result(Client.make(makeConnector(), {
            topology: { _tag: "Standalone", endpoint: fixture }
          }))
        )
        assert.strictEqual(error.reason, "Server")
        yield* Effect.promise(() => disconnected.promise).pipe(Effect.timeout("1 second"))
        assert.strictEqual(fixture.connections.length, 1)
        assert.isTrue(fixture.connections[0].socket.destroyed)
      }))

    it.live("rejects connection-state and blocking commands before shared submission", () =>
      Effect.gen(function*() {
        const requests: Array<ReadonlyArray<string>> = []
        const fixture = yield* server((request) => {
          requests.push(args(request))
          request.connection.send("+PONG\r\n")
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
        for (
          const command of [
            ["MULTI"],
            ["EXEC"],
            ["WATCH", "key"],
            ["AUTH", "secret"],
            ["SELECT", "1"],
            ["HELLO", "3"],
            ["ASKING"],
            ["SUBSCRIBE", "channel"],
            ["BLPOP", "list", "0"],
            ["XREAD", "BLOCK", "0", "STREAMS", "stream", "$"],
            ["CLIENT", "REPLY", "OFF"],
            ["CLIENT", "TRACKING", "ON"]
          ]
        ) {
          const error = failure(yield* Effect.result(client.execute(command)))
          assert.strictEqual(error.reason, "Routing")
          assert.strictEqual(error.outcome, "NotSent")
        }
        assert.deepStrictEqual(requests, [["PING"]])
      }))

    it.live("does not replay uncertain mutations and reconnects for subsequent commands", () =>
      Effect.gen(function*() {
        const requests: Array<ReadonlyArray<string>> = []
        const fixture = yield* server((request) => {
          const values = args(request)
          requests.push(values)
          if (values[0] === "INCR") request.connection.disconnect()
          else request.connection.send(values[0] === "GET" ? bulk("1") : "+PONG\r\n")
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
        const uncertain = failure(yield* Effect.result(client.execute(["INCR", "counter"])))
        assert.strictEqual(uncertain.reason, "Connection")
        assert.strictEqual(uncertain.outcome, "Unknown")
        assert.strictEqual(yield* client.run(Command.get("counter")), "1")
        assert.strictEqual(requests.filter((values) => values[0] === "INCR").length, 1)
        assert.strictEqual(fixture.connections.length, 2)
      }))

    it.live("keeps healthy nodes available while sharing a pending acquisition for another node", () =>
      Effect.gen(function*() {
        const healthy = yield* server((request) => request.connection.send("+PONG\r\n"))
        const cold = yield* server((request) => request.connection.send("+PONG\r\n"))
        const acquiring = barrier<void>()
        const release = barrier<void>()
        const base = makeConnector()
        let acquisitions = 0
        const connector: Connector = (endpoint) =>
          Effect.gen(function*() {
            if (endpoint.port === cold.port) {
              acquisitions++
              acquiring.resolve()
              yield* Effect.promise(() => release.promise)
            }
            return yield* base(endpoint)
          })
        const client = yield* Client.make(connector, { topology: { _tag: "Standalone", endpoint: healthy } })
        const pending = yield* Effect.forEach([1, 2], () => client.execute(["PING"], { node: cold, keyIndexes: [] }), {
          concurrency: "unbounded"
        }).pipe(Effect.forkChild)
        yield* Effect.promise(() => acquiring.promise)
        assert.strictEqual(Protocol.toValue(yield* client.execute(["PING"]).pipe(Effect.timeout("1 second"))), "PONG")
        assert.strictEqual(acquisitions, 1)
        release.resolve()
        assert.deepStrictEqual((yield* Fiber.join(pending)).map(Protocol.toValue), ["PONG", "PONG"])
        assert.strictEqual(cold.connections.length, 1)
      }))

    it.live("batches standalone commands and snapshots binary arguments before node acquisition", () =>
      Effect.gen(function*() {
        const source = yield* server((request) =>
          request.connection.send(args(request)[0] === "PING" ? "+PONG\r\n" : bulk("independent"))
        )
        const requests: Array<Request> = []
        const submitted = barrier<void>()
        const target = yield* server((request) => {
          requests.push(request)
          if (requests.length === 2) submitted.resolve()
        })
        const acquiring = barrier<void>()
        const release = barrier<void>()
        const base = makeConnector()
        const connector: Connector = (endpoint) =>
          Effect.gen(function*() {
            if (endpoint.port === target.port) {
              acquiring.resolve()
              yield* Effect.promise(() => release.promise)
            }
            return yield* base(endpoint)
          })
        const client = yield* Client.make(connector, { topology: { _tag: "Standalone", endpoint: source } })
        const key = Buffer.from("bar")
        const value = Buffer.from("new")
        const route = { node: { host: target.host, port: target.port }, keyIndexes: [1] }
        const pipeline = yield* client.pipeline([
          Command.make(["SET", key, value], Command.text, route),
          Command.make(["GET", key], Command.text, route),
          Command.get("foo"),
          Command.make(["MULTI"], Command.text)
        ]).pipe(Effect.forkChild)
        yield* Effect.promise(() => acquiring.promise)
        key.set(Buffer.from("baz"))
        value.set(Buffer.from("old"))
        route.node.port = source.port
        route.keyIndexes[0] = 100
        release.resolve()
        yield* Effect.promise(() => submitted.promise).pipe(Effect.timeout("1 second"))
        assert.deepStrictEqual(requests.map(args), [["SET", "bar", "new"], ["GET", "bar"]])
        requests[0].connection.send(Buffer.concat([Buffer.from("+OK\r\n"), bulk("new")]))
        const results = yield* Fiber.join(pipeline)
        assert.deepStrictEqual(
          results.slice(0, 3).map((result) => {
            assert.strictEqual(result._tag, "Success")
            return result._tag === "Success" ? result.success : undefined
          }),
          ["OK", "new", "independent"]
        )
        assert.strictEqual(failure(results[3]).outcome, "NotSent")
      }))

    it.live("allows stream keys and group operands named BLOCK on shared connections", () =>
      Effect.gen(function*() {
        const requests: Array<ReadonlyArray<string>> = []
        const fixture = yield* server((request) => {
          requests.push(args(request))
          request.connection.send("+OK\r\n")
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
        const commands = [
          ["XREAD", "STREAMS", "BLOCK", "$"],
          ["XREADGROUP", "GROUP", "STREAMS", "BLOCK", "STREAMS", "stream", ">"]
        ]
        for (const command of commands) yield* client.execute(command)
        assert.deepStrictEqual(requests.slice(1), commands)
      }))

    it.live("releases shared and reserved sockets before fixture cleanup and prevents reopening", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) => request.connection.send("+PONG\r\n"))
        const scope = yield* Scope.make()
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
          .pipe(
            Effect.provideService(Scope.Scope, scope)
          )
        const reserved = yield* client.reserve().pipe(Effect.provideService(Scope.Scope, scope))
        const closure = yield* client.closed.pipe(Effect.forkChild)
        yield* reserved.execute(["PING"])
        const closed = fixture.connections.map((connection) =>
          new Promise<void>((resolve) => connection.socket.once("close", resolve))
        )
        yield* Scope.close(scope, Exit.void)
        yield* Fiber.join(closure)
        yield* Effect.promise(() => Promise.all(closed))
        assert.isTrue(fixture.connections.every((connection) => connection.socket.destroyed))
        assert.strictEqual(failure(yield* Effect.result(client.execute(["PING"]))).reason, "Closed")
        assert.strictEqual(failure(yield* Effect.result(client.reserve())).reason, "Closed")
        assert.strictEqual(fixture.connections.length, 2)
      }))

    it.live("closes a reservation still acquiring when its client owner scope closes", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) => request.connection.send("+PONG\r\n"))
        const acquired = barrier<void>()
        const release = barrier<void>()
        let acquisition = 0
        const base = makeConnector()
        const connector: typeof base = (endpoint) =>
          Effect.gen(function*() {
            const transport = yield* base(endpoint)
            if (++acquisition === 2) {
              acquired.resolve()
              yield* Effect.promise(() => release.promise)
            }
            return transport
          })
        const owner = yield* Scope.make()
        const client = yield* Client.make(connector, { topology: { _tag: "Standalone", endpoint: fixture } }).pipe(
          Effect.provideService(Scope.Scope, owner)
        )
        // The caller scope remains open while the independent client owner closes.
        const acquiring = yield* client.reserve().pipe(Effect.result, Effect.forkChild)
        yield* Effect.promise(() => acquired.promise)
        assert.strictEqual(fixture.connections.length, 2)
        const closed = fixture.connections.map((connection) =>
          new Promise<void>((resolve) => connection.socket.once("close", resolve))
        )
        yield* Scope.close(owner, Exit.void)
        yield* Effect.promise(() => Promise.all(closed)).pipe(Effect.timeout("1 second"))
        assert.isTrue(fixture.connections.every((connection) => connection.socket.destroyed))
        release.resolve()
        const error = failure(yield* Fiber.join(acquiring))
        assert.strictEqual(error.reason, "Closed")
        assert.strictEqual(error.outcome, "NotSent")
      }))
  })

  describe("Cluster", () => {
    it.live("follows MOVED safely and caches the redirected slot for subsequent commands", () =>
      Effect.gen(function*() {
        const targetRequests: Array<ReadonlyArray<string>> = []
        const target = yield* server((request) => {
          const values = args(request)
          targetRequests.push(values)
          request.connection.send(values[0] === "GET" ? bulk("value") : "+PONG\r\n")
        })
        const sourceRequests: Array<ReadonlyArray<string>> = []
        const source = yield* server((request) => {
          if (discovery(request, source)) return
          sourceRequests.push(args(request))
          request.connection.send(`-MOVED 5061 ${target.host}:${target.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [source] } })
        assert.strictEqual(yield* client.run(Command.get("bar")), "value")
        assert.strictEqual(yield* client.run(Command.get("bar")), "value")
        assert.deepStrictEqual(sourceRequests, [["GET", "bar"]])
        assert.deepStrictEqual(targetRequests.filter((values) => values[0] === "GET"), [["GET", "bar"], ["GET", "bar"]])
      }))

    it.live("snapshots binary arguments and routing before redirect connection acquisition", () =>
      Effect.gen(function*() {
        const received: Array<ReadonlyArray<string>> = []
        const target = yield* server((request) => {
          received.push(args(request))
          request.connection.send(bulk("value"))
        })
        const source = yield* server((request) => {
          if (!discovery(request, source)) request.connection.send(`-MOVED 5061 ${target.host}:${target.port}\r\n`)
        })
        const acquiring = barrier<void>()
        const release = barrier<void>()
        const base = makeConnector()
        const connector: typeof base = (endpoint) =>
          Effect.gen(function*() {
            if (endpoint.port === target.port) {
              acquiring.resolve()
              yield* Effect.promise(() => release.promise)
            }
            return yield* base(endpoint)
          })
        const client = yield* Client.make(connector, { topology: { _tag: "Cluster", seeds: [source] } })
        const key = Buffer.from("bar")
        const command: Array<Protocol.Argument> = ["GET", key]
        const routing = { keyIndexes: [1] }
        const executing = yield* client.execute(command, routing).pipe(Effect.forkChild)
        yield* Effect.promise(() => acquiring.promise)
        key.set(Buffer.from("foo"))
        command[0] = "DEL"
        routing.keyIndexes[0] = 100
        release.resolve()
        assert.strictEqual(Protocol.toValue(yield* Fiber.join(executing)), "value")
        assert.deepStrictEqual(received, [["GET", "bar"]])
      }))

    it.live("holds ASKING and its redirected command on one exclusive connection", () =>
      Effect.gen(function*() {
        const asking = barrier<Request>()
        const targetRequests: Array<readonly [number, ReadonlyArray<string>]> = []
        const target = yield* server((request) => {
          const values = args(request)
          targetRequests.push([request.connection.number, values])
          if (values[0] === "ASKING") asking.resolve(request)
          else request.connection.send(values[0] === "GET" ? bulk("value") : "+PONG\r\n")
        })
        const source = yield* server((request) => {
          if (!discovery(request, source)) request.connection.send(`-ASK 5061 ${target.host}:${target.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [source] } })
        const redirected = yield* client.run(Command.get("bar")).pipe(Effect.forkChild)
        const askingRequest = yield* Effect.promise(() => asking.promise)
        assert.strictEqual(Protocol.toValue(yield* client.execute(["PING"], { node: target, keyIndexes: [] })), "PONG")
        askingRequest.connection.send("+OK\r\n")
        assert.strictEqual(yield* Fiber.join(redirected), "value")
        const command = targetRequests.find(([, values]) => values[0] === "GET")!
        const ping = targetRequests.find(([, values]) => values[0] === "PING")!
        assert.strictEqual(command[0], askingRequest.connection.number)
        assert.notStrictEqual(ping[0], askingRequest.connection.number)
      }))

    it.live("submits a whole same-node pipeline before any command replies", () =>
      Effect.gen(function*() {
        const requests: Array<Request> = []
        const submitted = barrier<void>()
        const fixture = yield* server((request) => {
          if (discovery(request, fixture)) return
          requests.push(request)
          if (requests.length === 3) submitted.resolve()
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [fixture] } })
        const pipeline = yield* client.pipeline([
          Command.set("bar", "new"),
          Command.get("bar"),
          Command.get("foo")
        ]).pipe(Effect.forkChild)
        yield* Effect.promise(() => submitted.promise).pipe(Effect.timeout("1 second"))
        assert.deepStrictEqual(requests.map(args), [["SET", "bar", "new"], ["GET", "bar"], ["GET", "foo"]])
        requests[0].connection.send(Buffer.concat([Buffer.from("+OK\r\n"), bulk("new"), bulk("independent")]))
        assert.deepStrictEqual(
          (yield* Fiber.join(pipeline)).map((result) => {
            assert.strictEqual(result._tag, "Success")
            return result._tag === "Success" ? result.success : undefined
          }),
          ["OK", "new", "independent"]
        )
      }))

    it.live("batches ASKING-command pairs in order on one exclusive redirect session", () =>
      Effect.gen(function*() {
        const targetRequests: Array<Request> = []
        const submitted = barrier<void>()
        const target = yield* server((request) => {
          targetRequests.push(request)
          if (targetRequests.length === 4) submitted.resolve()
        })
        const sourceRequests: Array<Request> = []
        const source = yield* server((request) => {
          if (discovery(request, source)) return
          sourceRequests.push(request)
          if (sourceRequests.length === 3) {
            const redirect = "-ASK 5061 " + target.host + ":" + target.port + "\r\n"
            request.connection.send(Buffer.concat([Buffer.from(redirect + redirect), bulk("independent")]))
          }
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [source] } })
        const pipeline = yield* client.pipeline([
          Command.set("bar", "new"),
          Command.get("bar"),
          Command.get("foo")
        ]).pipe(Effect.forkChild)
        yield* Effect.promise(() => submitted.promise).pipe(Effect.timeout("1 second"))
        assert.deepStrictEqual(sourceRequests.map(args), [["SET", "bar", "new"], ["GET", "bar"], ["GET", "foo"]])
        assert.deepStrictEqual(targetRequests.map(args), [["ASKING"], ["SET", "bar", "new"], ["ASKING"], [
          "GET",
          "bar"
        ]])
        assert.strictEqual(new Set(targetRequests.map((request) => request.connection.number)).size, 1)
        targetRequests[0].connection.send(Buffer.concat([Buffer.from("+OK\r\n+OK\r\n+OK\r\n"), bulk("new")]))
        assert.deepStrictEqual(
          (yield* Fiber.join(pipeline)).map((result) => {
            assert.strictEqual(result._tag, "Success")
            return result._tag === "Success" ? result.success : undefined
          }),
          ["OK", "new", "independent"]
        )
      }))

    it.live("recovers redirects while an unrelated node is still withholding its replies", () =>
      Effect.gen(function*() {
        const redirected = barrier<void>()
        const target = yield* server((request) => {
          request.connection.send(bulk("value"))
          redirected.resolve()
        })
        const waiting = barrier<Request>()
        const slow = yield* server((request) => waiting.resolve(request))
        const source = yield* server((request) => {
          if (!discovery(request, source)) request.connection.send(`-MOVED 5061 ${target.host}:${target.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [source] } })
        const pipeline = yield* client.pipeline([
          Command.get("bar"),
          Command.make(["PING"], Command.text, { node: slow, keyIndexes: [] })
        ]).pipe(Effect.forkChild)
        const held = yield* Effect.promise(() => waiting.promise)
        yield* Effect.promise(() => redirected.promise).pipe(Effect.timeout("1 second"))
        held.connection.send("+PONG\r\n")
        assert.deepStrictEqual(
          (yield* Fiber.join(pipeline)).map((result) => {
            assert.strictEqual(result._tag, "Success")
            return result._tag === "Success" ? result.success : undefined
          }),
          ["value", "PONG"]
        )
      }))

    it.live("batches MOVED retries without replaying successful or uncertain mutations", () =>
      Effect.gen(function*() {
        const targetRequests: Array<Request> = []
        const submitted = barrier<void>()
        const target = yield* server((request) => {
          targetRequests.push(request)
          if (targetRequests.length === 2) submitted.resolve()
        })
        const sourceRequests: Array<Request> = []
        const source = yield* server((request) => {
          if (discovery(request, source)) return
          sourceRequests.push(request)
          if (sourceRequests.length === 4) {
            const redirect = "-MOVED 5061 " + target.host + ":" + target.port + "\r\n"
            request.connection.socket.end(redirect + redirect + ":1\r\n")
          }
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [source] } })
        const pipeline = yield* client.pipeline([
          Command.make(["INCR", "{bar}:first"], Command.integer),
          Command.make(["INCR", "{bar}:second"], Command.integer),
          Command.make(["INCR", "{bar}:success"], Command.integer),
          Command.make(["INCR", "{foo}:unknown"], Command.integer)
        ]).pipe(Effect.forkChild)
        yield* Effect.promise(() => submitted.promise).pipe(Effect.timeout("1 second"))
        assert.deepStrictEqual(targetRequests.map(args), [["INCR", "{bar}:first"], ["INCR", "{bar}:second"]])
        targetRequests[0].connection.send(":1\r\n:1\r\n")
        const results = yield* Fiber.join(pipeline)
        assert.deepStrictEqual(
          results.slice(0, 3).map((result) => {
            assert.strictEqual(result._tag, "Success")
            return result._tag === "Success" ? result.success : undefined
          }),
          [BigInt(1), BigInt(1), BigInt(1)]
        )
        assert.strictEqual(failure(results[3]).outcome, "Unknown")
        assert.strictEqual(sourceRequests.length, 4)
        assert.strictEqual(targetRequests.length, 2)
      }))

    it.live("bounds redirect cycles instead of repeatedly submitting rejected commands", () =>
      Effect.gen(function*() {
        let mutations = 0
        const fixture = yield* server((request) => {
          if (discovery(request, fixture)) return
          mutations++
          request.connection.send(`-MOVED 5061 ${fixture.host}:${fixture.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Cluster", seeds: [fixture], maxRedirects: 2 }
        })
        const error = failure(yield* Effect.result(client.execute(["INCR", "bar"])))
        assert.strictEqual(error.reason, "Routing")
        assert.strictEqual(error.code, "MOVED")
        assert.strictEqual(mutations, 3)
        const results = yield* client.pipeline([
          Command.make(["INCR", "{bar}:first"], Command.integer),
          Command.make(["INCR", "{bar}:second"], Command.integer)
        ])
        for (const result of results) {
          assert.strictEqual(failure(result).reason, "Routing")
          assert.strictEqual(failure(result).code, "MOVED")
        }
        assert.strictEqual(mutations, 9)
      }))

    it.live("validates every reserved pipeline command before submitting any connection state", () =>
      Effect.gen(function*() {
        const requests: Array<ReadonlyArray<string>> = []
        const fixture = yield* server((request) => {
          if (discovery(request, fixture)) return
          requests.push(args(request))
          request.connection.send("+OK\r\n")
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [fixture] } })
        const reserved = yield* client.reserve({ key: "bar" })
        const error = failure(
          yield* Effect.result(reserved.pipeline([
            { arguments: ["MULTI"] },
            { arguments: ["SET", "foo", "bad"] },
            { arguments: ["EXEC"] }
          ]))
        )
        assert.strictEqual(error.code, "CROSSSLOT")
        assert.strictEqual(error.outcome, "NotSent")
        assert.deepStrictEqual(requests, [])
      }))

    it.live("repeats ASKING on each exclusive session in an ASK redirect chain", () =>
      Effect.gen(function*() {
        const lastRequests: Array<ReadonlyArray<string>> = []
        const authorized = new Set<number>()
        const last = yield* server((request) => {
          const values = args(request)
          lastRequests.push(values)
          if (values[0] === "ASKING") {
            authorized.add(request.connection.number)
            request.connection.send("+OK\r\n")
          } else {request.connection.send(
              authorized.delete(request.connection.number) ? bulk("value") : "-ERR missing ASKING\r\n"
            )}
        })
        const middle = yield* server((request) =>
          request.connection.send(
            args(request)[0] === "ASKING"
              ? "+OK\r\n"
              : `-ASK 5061 ${last.host}:${last.port}\r\n`
          )
        )
        const first = yield* server((request) => {
          if (!discovery(request, first)) request.connection.send(`-ASK 5061 ${middle.host}:${middle.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Cluster", seeds: [first], maxRedirects: 2 }
        })
        assert.strictEqual(yield* client.run(Command.get("bar")), "value")
        assert.deepStrictEqual(lastRequests, [["ASKING"], ["GET", "bar"]])
        assert.strictEqual(last.connections.length, 1)
      }))

    it.live("charges every ASK redirect against the configured redirect budget", () =>
      Effect.gen(function*() {
        let lastRequests = 0
        const last = yield* server((request) => {
          lastRequests++
          request.connection.send(bulk("value"))
        })
        const middle = yield* server((request) =>
          request.connection.send(
            args(request)[0] === "ASKING"
              ? "+OK\r\n"
              : `-ASK 5061 ${last.host}:${last.port}\r\n`
          )
        )
        const first = yield* server((request) => {
          if (!discovery(request, first)) request.connection.send(`-ASK 5061 ${middle.host}:${middle.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Cluster", seeds: [first], maxRedirects: 1 }
        })
        const error = failure(yield* Effect.result(client.run(Command.get("bar"))))
        assert.strictEqual(error.reason, "Routing")
        assert.strictEqual(error.code, "ASK")
        assert.strictEqual(lastRequests, 0)
        assert.strictEqual(last.connections.length, 0)
      }))

    describe("topology", () => {
      const encoder = new TextEncoder()
      const seed: Endpoint = { host: "seed", port: 7000 }
      const config: ClusterConfig = { _tag: "Cluster", seeds: [seed] }

      // Test-side writer implements the server reply grammar without the production encoder.
      const wire = (value: unknown): string => {
        if (typeof value === "string") return `$${encoder.encode(value).length}\r\n${value}\r\n`
        if (typeof value === "number") return `:${value}\r\n`
        if (value === null) return "$-1\r\n"
        if (Array.isArray(value)) return `*${value.length}\r\n${value.map(wire).join("")}`
        if (value instanceof Map) {
          return `%${value.size}\r\n${Array.from(value, ([key, item]) => wire(key) + wire(item)).join("")}`
        }
        throw new Error("Unsupported fixture value")
      }
      const reply = (value: unknown): Protocol.Reply => Protocol.makeParser().push(encoder.encode(wire(value)))[0]
      const slots = (
        host = "primary",
        port = 7001
      ): ReadonlyArray<unknown> => [[0, 8191, [host, port, "id-a"]], [8192, 16383, ["other", 7002, "id-b"]]]
      const shards = (asMap: boolean, host = "primary", port = 7001): ReadonlyArray<unknown> => {
        const fields = (values: ReadonlyArray<readonly [string, unknown]>) => asMap ? new Map(values) : values.flat()
        return [
          fields([["slots", [0, 8191]], ["nodes", [
            fields([["id", "replica-a"], ["role", "replica"], ["health", "online"], ["ip", "replica"], ["port", 7101]]),
            fields([["id", "primary-a"], ["role", "master"], ["health", "online"], ["ip", host], ["endpoint", host], [
              "port",
              port
            ]])
          ]]]),
          fields([["slots", [8192, 16383]], ["nodes", [
            fields([["id", "primary-b"], ["role", "master"], ["health", "online"], ["ip", "other"], ["port", 7002]])
          ]]])
        ]
      }

      const fixture = (respond: (endpoint: Endpoint, args: ReadonlyArray<string>) => string) => {
        const commands: Array<readonly [Endpoint, ReadonlyArray<string>]> = []
        let opens = 0
        let closes = 0
        const connector: Connector = (endpoint) =>
          Effect.gen(function*() {
            opens++
            const replies = yield* Queue.unbounded<Uint8Array, RedisError>()
            let closed = false
            const close = Effect.sync(() => {
              if (closed) return
              closed = true
              closes++
              Queue.failCauseUnsafe(
                replies,
                Cause.fail(new RedisError({ reason: "Closed", message: "fixture closed" }))
              )
            })
            return yield* Effect.acquireRelease(
              Effect.succeed({
                read: Queue.take(replies),
                close,
                write: (bytes: Uint8Array) =>
                  Effect.try({
                    try: () => {
                      // Discovery commands only contain ASCII arguments; decode their bulk framing independently.
                      const parts = new TextDecoder().decode(bytes).split("\r\n")
                      const args: Array<string> = []
                      for (let i = 2; i < parts.length - 1; i += 2) args.push(parts[i])
                      commands.push([endpoint, args])
                      Queue.offerUnsafe(replies, encoder.encode(respond(endpoint, args)))
                    },
                    catch: (cause) =>
                      cause instanceof RedisError
                        ? cause
                        : new RedisError({ reason: "Connection", message: "fixture failed", cause })
                  })
              }),
              () => close
            )
          })
        return { connector, commands, counts: () => [opens, closes] }
      }

      const rejected = (result: { readonly _tag: string; readonly failure?: unknown }): void => {
        assert.strictEqual(result._tag, "Failure")
        assert.strictEqual((result.failure as RedisError).reason, "Routing")
        assert.strictEqual((result.failure as RedisError).outcome, "NotSent")
      }
      const error = (message: string): RedisError =>
        new RedisError({ reason: "Server", code: message.split(" ")[0], message })

      it("computes CRC16/XMODEM with known reference vectors and Redis hash tags", () => {
        assert.strictEqual(Cluster.crc16(encoder.encode("123456789")), 0x31c3)
        assert.strictEqual(Cluster.keySlot("foo"), 12182)
        assert.strictEqual(Cluster.keySlot("bar"), 5061)
        assert.strictEqual(Cluster.keySlot("{bar}:one"), 5061)
        assert.strictEqual(Cluster.keySlot("{bar}:two"), 5061)
        assert.strictEqual(Cluster.keySlot("foo{}{bar}"), 8363)
        assert.strictEqual(Cluster.keySlot("foo{{bar}}"), 4015)
        assert.strictEqual(Cluster.keySlot(""), 0)
        assert.strictEqual(Cluster.keySlot(new Uint8Array([0, 255, 123, 0, 255, 125, 42])), 7920)
        assert.strictEqual(Cluster.keySlot(new Uint8Array([0, 255])), 7920)
        assert.strictEqual(Cluster.keySlot(encoder.encode("é{bar}☃")), 5061)
      })

      it("parses RESP2 field arrays and RESP3 maps in SHARDS and ignores replicas", () => {
        for (const asMap of [false, true]) {
          const discovery = Cluster.parseShards(reply(shards(asMap)), seed, config)
          assert.deepStrictEqual(discovery.primaries, [
            { host: "primary", port: 7001, tls: undefined },
            { host: "other", port: 7002, tls: undefined }
          ])
          assert.strictEqual(discovery.owners.length, 16384)
          assert.strictEqual(discovery.owners[8191].port, 7001)
          assert.strictEqual(discovery.owners[8192].port, 7002)
        }
      })

      it("parses SLOTS with null/empty advertised hosts, IPv6, TLS, and endpoint remapping", () => {
        const tls = { servername: "redis.example" }
        const discovered = Cluster.parseSlots(reply([[0, 8191, [null, 7001]], [8192, 16383, ["[::1]", 7002]]]), {
          ...seed,
          tls
        }, { ...config, mapAddress: (endpoint) => ({ ...endpoint, port: endpoint.port + 1000 }) })
        assert.deepStrictEqual(discovered.primaries, [{ host: "seed", port: 8001, tls }, {
          host: "::1",
          port: 8002,
          tls
        }])
        const empty = Cluster.parseSlots(reply([[0, 16383, ["", 7001]]]), seed, config)
        assert.strictEqual(empty.owners[0].host, "seed")
      })

      it("rejects malformed, incomplete, overlapping, offline, and invalid topology snapshots", () => {
        for (
          const value of [
            [],
            [[0, 100, ["primary", 7001]]],
            [[0, 16384, ["primary", 7001]]],
            [[0, 16383, ["primary", 7001]], [1, 2, ["other", 7002]]],
            [[10, 2, ["primary", 7001]]],
            [[0, 16383, ["primary", 0]]],
            [[0, 16383, ["bad host", 7001]]],
            [[0, 16383, ["primary", "7001"]]],
            [[0, 16383]],
            [[0, 16383, ["primary"]]]
          ]
        ) assert.throws(() => Cluster.parseSlots(reply(value), seed, config))
        for (
          const value of [
            [["slots", [0, 16383], "nodes", []]],
            [["slots", [0, 16383], "nodes", [["role", "master", "health", "loading", "ip", "primary", "port", 7001]]]],
            [["slots", [0, 1, 2], "nodes", [["role", "master", "health", "online", "ip", "primary", "port", 7001]]]],
            [["slots", [0, 16383], "nodes"]]
          ]
        ) assert.throws(() => Cluster.parseShards(reply(value), seed, config))
      })

      it.effect("tries failed seeds, falls back for unsupported SHARDS, and closes discovery sessions", () =>
        Effect.gen(function*() {
          const mock = fixture((endpoint, args) => {
            if (endpoint.port === 1) throw new RedisError({ reason: "Connection", message: "unavailable" })
            return args[1] === "SHARDS" ? "-ERR unknown subcommand 'SHARDS'. Try CLUSTER HELP.\r\n" : wire(slots())
          })
          const topology = yield* Cluster.make(mock.connector, { ...config, seeds: [{ ...seed, port: 1 }, seed] })
          assert.deepStrictEqual(mock.counts(), [2, 2])
          assert.deepStrictEqual(mock.commands.map(([, args]) => args), [["CLUSTER", "SHARDS"], ["CLUSTER", "SHARDS"], [
            "CLUSTER",
            "SLOTS"
          ]])
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.host, "primary")
          assert.strictEqual((yield* topology.resolve(["GET", "foo"])).endpoint.host, "other")
        }))

      it.effect("initializes discovery with data authentication, RESP3, and TLS", () =>
        Effect.gen(function*() {
          const tls = { servername: "redis.example" }
          const mock = fixture((_, args) => args[0] === "CLUSTER" ? wire(shards(true)) : "+OK\r\n")
          const topology = yield* Cluster.make(mock.connector, { ...config, seeds: [{ ...seed, tls }] }, {
            username: "user",
            password: "secret",
            protocol: 3,
            clientName: "effect"
          })
          assert.deepStrictEqual(mock.commands.map(([, args]) => args), [
            ["AUTH", "user", "secret"],
            ["HELLO", "3"],
            ["CLIENT", "SETNAME", "effect"],
            ["CLUSTER", "SHARDS"]
          ])
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.tls, tls)
          assert.deepStrictEqual(mock.counts(), [1, 1])
        }))

      it.effect("does not hide authentication failures behind SLOTS fallback", () =>
        Effect.gen(function*() {
          const mock = fixture(() => "-NOPERM this user has no permissions\r\n")
          rejected(yield* Effect.result(Cluster.make(mock.connector, config)))
          assert.deepStrictEqual(mock.commands.map(([, args]) => args), [["CLUSTER", "SHARDS"]])
          assert.deepStrictEqual(mock.counts(), [1, 1])
        }))

      it.effect("enforces declared/inferred same-slot affinity and validates dynamic key indexes", () =>
        Effect.gen(function*() {
          const mock = fixture(() => wire(shards(false)))
          const topology = yield* Cluster.make(mock.connector, config)
          for (
            const args of [
              ["MGET", "{bar}:a", "{bar}:b"],
              ["EVAL", "return 1", "2", "{bar}:a", "{bar}:b"],
              ["FCALL", "f", "1", "{bar}:a", "non-key"],
              ["XREAD", "COUNT", "5", "STREAMS", "{bar}:a", "{bar}:b", "0", "0"],
              ["MSET", "{bar}:a", "value", "{bar}:b", "value"],
              ["BLPOP", "{bar}:a", "{bar}:b", "1"]
            ]
          ) assert.strictEqual((yield* topology.resolve(args)).slot, 5061)
          for (
            const args of [["MGET", "foo", "bar"], ["EVAL", "return 1", "2", "foo", "bar"], [
              "XREAD",
              "STREAMS",
              "foo",
              "bar",
              "0",
              "0"
            ]]
          ) {
            rejected(yield* Effect.result(topology.resolve(args)))
          }
          rejected(yield* Effect.result(topology.resolve(["MODULE.CMD", "key"])))
          assert.strictEqual((yield* topology.resolve(["MODULE.CMD", "bar"], { keyIndexes: [1] })).slot, 5061)
          for (const index of [-1, 0, 2, 1.5, NaN]) {
            rejected(yield* Effect.result(topology.resolve(["GET", "bar"], { keyIndexes: [index] })))
          }
          rejected(yield* Effect.result(topology.resolve([])))
          const owner = (yield* topology.resolve(["GET", "bar"])).endpoint
          assert.deepStrictEqual((yield* topology.resolve(["GET", "bar"], { node: owner })).endpoint, owner)
          rejected(yield* Effect.result(topology.resolve(["GET", "foo"], { node: owner })))
          const target = { host: "explicit", port: 7777 }
          assert.deepStrictEqual((yield* topology.resolve(["SCAN", "0"], { node: target })).endpoint, target)
          assert.deepStrictEqual((yield* topology.resolve(["MODULE.NODECMD"], { node: target })).endpoint, target)
          assert.strictEqual((yield* topology.resolve(["PING"])).slot, undefined)
        }))

      it.effect("updates MOVED ownership while ASK stays transient and preserves TLS/remapping", () =>
        Effect.gen(function*() {
          const tls = true
          const mock = fixture(() => wire(shards(false)))
          const topology = yield* Cluster.make(mock.connector, {
            ...config,
            seeds: [{ ...seed, tls }],
            mapAddress: (endpoint) => ({ ...endpoint, port: endpoint.port + 100 })
          })
          const from = (yield* topology.resolve(["GET", "bar"])).endpoint
          assert.deepStrictEqual(topology.redirect(error("ASK 5061 [::1]:8000"), from), {
            endpoint: { host: "::1", port: 8100, tls },
            slot: 5061,
            asking: true
          })
          assert.deepStrictEqual((yield* topology.resolve(["GET", "bar"])).endpoint, from)
          assert.deepStrictEqual(topology.redirect(error("MOVED 5061 2001:db8::1:9000"), from), {
            endpoint: { host: "2001:db8::1", port: 9100, tls },
            slot: 5061,
            asking: false
          })
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.host, "2001:db8::1")
          assert.isTrue(topology.endpoints().some((endpoint) => endpoint.host === "2001:db8::1"))
          assert.strictEqual(topology.redirect(error("ASK 5061 :8000"), from)!.endpoint.host, from.host)
          for (
            const message of [
              "MOVED -1 host:1",
              "MOVED 16384 host:1",
              "ASK 1 host:0",
              "ASK 1 host:65536",
              "MOVED 1 host",
              "MOVED 1 host:bad",
              "MOVED 1 host:1 extra"
            ]
          ) {
            assert.strictEqual(topology.redirect(error(message), from), undefined)
          }
          assert.strictEqual(
            topology.redirect(new RedisError({ reason: "Connection", message: "MOVED 5061 host:8000" }), from),
            undefined
          )
        }))

      it.effect("refreshes promoted primaries and retains the last valid topology after discovery failure", () =>
        Effect.gen(function*() {
          let promoted = false
          let unavailable = false
          const mock = fixture(() => {
            if (unavailable) throw new RedisError({ reason: "Connection", message: "unavailable" })
            return wire(shards(false, promoted ? "promoted" : "primary", promoted ? 8001 : 7001))
          })
          const topology = yield* Cluster.make(mock.connector, config)
          promoted = true
          yield* topology.refresh
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.host, "promoted")
          unavailable = true
          rejected(yield* Effect.result(topology.refresh))
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.host, "promoted")
          assert.strictEqual(mock.counts()[0], mock.counts()[1])
        }))

      it.effect("rejects seedless Cluster and nonzero databases without acquiring a transport", () =>
        Effect.gen(function*() {
          const mock = fixture(() => wire(shards(false)))
          rejected(yield* Effect.result(Cluster.make(mock.connector, { ...config, seeds: [] })))
          rejected(yield* Effect.result(Cluster.make(mock.connector, config, { database: 1 })))
          assert.deepStrictEqual(mock.counts(), [0, 0])
        }))

      it.effect("rejects unbounded or invalid redirect limits before discovery", () =>
        Effect.gen(function*() {
          const mock = fixture(() => wire(shards(false)))
          for (const maxRedirects of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
            rejected(yield* Effect.result(Cluster.make(mock.connector, { ...config, maxRedirects })))
          }
          assert.deepStrictEqual(mock.counts(), [0, 0])
          yield* Cluster.make(mock.connector, { ...config, maxRedirects: 0 })
          assert.deepStrictEqual(mock.counts(), [1, 1])
        }))
    })
  })

  describe("Sentinel", () => {
    it.live("batches safely rejected writes after promotion without replaying successful or uncertain commands", () =>
      Effect.gen(function*() {
        const role = "*3\r\n$6\r\nmaster\r\n:0\r\n*0\r\n"
        const submitted = barrier<void>()
        const nextRequests: Array<Request> = []
        const next = yield* server((request) => {
          const command = args(request)[0]
          if (command === "ROLE") request.connection.send(role)
          else {
            nextRequests.push(request)
            if (nextRequests.length === 2) submitted.resolve()
          }
        })
        let promoted = false
        const oldRequests: Array<Request> = []
        const old = yield* server((request) => {
          const command = args(request)[0]
          if (command === "ROLE") request.connection.send(role)
          else if (command === "PING") request.connection.send("+PONG\r\n")
          else {
            oldRequests.push(request)
            if (oldRequests.length === 4) {
              promoted = true
              request.connection.socket.end("-READONLY former primary\r\n-READONLY former primary\r\n:1\r\n")
            }
          }
        })
        let discoveries = 0
        const sentinel = yield* server((request) => {
          discoveries++
          const primary = promoted ? next : old
          request.connection.send(
            Buffer.concat([Buffer.from("*2\r\n"), bulk(primary.host), bulk(String(primary.port))])
          )
        })
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Sentinel", sentinels: [sentinel], masterName: "service", refreshInterval: "1 hour" }
        })
        const pipeline = yield* client.pipeline([
          Command.make(["INCR", "first"], Command.integer),
          Command.make(["INCR", "second"], Command.integer),
          Command.make(["INCR", "success"], Command.integer),
          Command.make(["INCR", "unknown"], Command.integer)
        ]).pipe(Effect.forkChild)
        yield* Effect.promise(() => submitted.promise).pipe(Effect.timeout("1 second"))
        assert.deepStrictEqual(nextRequests.map(args), [["INCR", "first"], ["INCR", "second"]])
        nextRequests[0].connection.send(":1\r\n:1\r\n")
        const results = yield* Fiber.join(pipeline)
        assert.deepStrictEqual(
          results.slice(0, 3).map((result) => {
            assert.strictEqual(result._tag, "Success")
            return result._tag === "Success" ? result.success : undefined
          }),
          [BigInt(1), BigInt(1), BigInt(1)]
        )
        assert.strictEqual(failure(results[3]).outcome, "Unknown")
        assert.strictEqual(discoveries, 2)
        assert.strictEqual(oldRequests.length, 4)
        assert.strictEqual(nextRequests.length, 2)
      }))

    it.live("redacts exposed data and Sentinel passwords while authenticating both connections", () =>
      Effect.gen(function*() {
        const dataAuth: Array<ReadonlyArray<string>> = []
        const data = yield* server((request) => {
          const values = args(request)
          if (values[0] === "AUTH") dataAuth.push(values)
          request.connection.send(values[0] === "ROLE" ? "*1\r\n$6\r\nmaster\r\n" : "+OK\r\n")
        })
        const sentinelAuth: Array<ReadonlyArray<string>> = []
        const sentinel = yield* server((request) => {
          if (args(request)[0] === "AUTH") {
            sentinelAuth.push(args(request))
            request.connection.send("+OK\r\n")
          } else {request.connection.send(
              Buffer.concat([Buffer.from("*2\r\n"), bulk(data.host), bulk(String(data.port))])
            )}
        })
        const client = yield* Client.make(makeConnector(), {
          password: "data-secret",
          topology: { _tag: "Sentinel", sentinels: [sentinel], masterName: "service", password: "sentinel-secret" }
        })
        assert.isTrue(Redacted.isRedacted(client.config.password))
        assert.strictEqual(client.config.topology?._tag, "Sentinel")
        if (client.config.topology?._tag !== "Sentinel") return assert.fail("Expected Sentinel configuration")
        assert.isTrue(Redacted.isRedacted(client.config.topology.password))
        assert.isFalse(JSON.stringify(client.config).includes("data-secret"))
        assert.isFalse(JSON.stringify(client.config).includes("sentinel-secret"))
        assert.deepStrictEqual(sentinelAuth, [["AUTH", "sentinel-secret"]])
        assert.isTrue(dataAuth.length > 0)
        assert.isTrue(dataAuth.every((command) => command[1] === "data-secret"))
      }))

    it.live("refreshes Sentinel after replacement acquisition fails without replaying the command", () =>
      Effect.gen(function*() {
        const oldRequests: Array<ReadonlyArray<string>> = []
        const old = yield* server((request) => {
          const values = args(request)
          oldRequests.push(values)
          request.connection.send(values[0] === "ROLE" ? "*1\r\n$6\r\nmaster\r\n" : "+PONG\r\n")
        })
        const nextRequests: Array<ReadonlyArray<string>> = []
        const next = yield* server((request) => {
          const values = args(request)
          nextRequests.push(values)
          request.connection.send(values[0] === "ROLE" ? "*1\r\n$6\r\nmaster\r\n" : ":1\r\n")
        })
        let promoted = false
        let discoveries = 0
        const readFailed = barrier<void>()
        const sentinel = yield* server((request) => {
          discoveries++
          const primary = promoted ? next : old
          request.connection.send(
            Buffer.concat([Buffer.from("*2\r\n"), bulk(primary.host), bulk(String(primary.port))])
          )
        })
        const base = makeConnector()
        const connector: typeof base = (endpoint) =>
          promoted && endpoint.port === old.port
            ? Effect.fail(
              new RedisError({ reason: "Connection", message: "old primary unavailable", outcome: "NotSent" })
            )
            : base(endpoint).pipe(Effect.map((transport) => ({
              ...transport,
              read: transport.read.pipe(Effect.tapError(() =>
                Effect.sync(() => {
                  if (promoted && endpoint.port === old.port) readFailed.resolve()
                })
              ))
            })))
        const client = yield* Client.make(connector, {
          topology: { _tag: "Sentinel", sentinels: [sentinel], masterName: "service" }
        })
        promoted = true
        const socket = old.connections[old.connections.length - 1]
        const disconnected = new Promise<void>((resolve) => socket.socket.once("close", resolve))
        socket.disconnect()
        yield* Effect.promise(() => disconnected)
        yield* Effect.promise(() => readFailed.promise)
        const error = failure(yield* Effect.result(client.execute(["INCR", "counter"])))
        assert.strictEqual(error.outcome, "NotSent")
        assert.strictEqual(discoveries, 2)
        assert.strictEqual(Protocol.toValue(yield* client.execute(["INCR", "counter"])), 1)
        assert.strictEqual(oldRequests.filter((values) => values[0] === "INCR").length, 0)
        assert.strictEqual(nextRequests.filter((values) => values[0] === "INCR").length, 1)
      }))

    describe("discovery", () => {
      const seed = (port: number): Endpoint => ({ host: "sentinel", port })
      const primary = (port: number): Endpoint => ({ host: "redis", port })
      const encoder = new TextEncoder()
      const blob = (text: string) => `$${encoder.encode(text).length}\r\n${text}\r\n`
      const location = (port: number) => `*2\r\n${blob("redis")}${blob(String(port))}`
      const master = "*3\r\n$6\r\nmaster\r\n:0\r\n*0\r\n"
      const replica = "*5\r\n$5\r\nslave\r\n$5\r\nredis\r\n:7001\r\n$9\r\nconnected\r\n:0\r\n"

      const fixture = (respond: (endpoint: Endpoint, args: ReadonlyArray<string>) => string | undefined) => {
        const commands: Array<readonly [Endpoint, ReadonlyArray<string>]> = []
        let opens = 0
        let closes = 0
        const connector: Connector = (endpoint) =>
          Effect.gen(function*() {
            opens++
            const replies = yield* Queue.unbounded<Uint8Array, RedisError>()
            let closed = false
            const close = Effect.sync(() => {
              if (closed) return
              closed = true
              closes++
              Queue.failCauseUnsafe(
                replies,
                Cause.fail(new RedisError({ reason: "Closed", message: "fixture closed" }))
              )
            })
            return yield* Effect.acquireRelease(
              Effect.succeed({
                read: Queue.take(replies),
                close,
                write: (bytes: Uint8Array) =>
                  Effect.try({
                    try: () => {
                      // Independent decoder for this fixture's ASCII bulk command arguments.
                      const wire = new TextDecoder().decode(bytes).split("\r\n")
                      const args: Array<string> = []
                      for (let index = 2; index < wire.length - 1; index += 2) args.push(wire[index])
                      commands.push([endpoint, args])
                      const response = respond(endpoint, args)
                      if (response !== undefined) Queue.offerUnsafe(replies, encoder.encode(response))
                    },
                    catch: (cause) =>
                      cause instanceof RedisError
                        ? cause
                        : new RedisError({ reason: "Connection", message: "fixture failed", cause })
                  })
              }),
              () => close
            )
          })
        return { connector, commands, counts: () => [opens, closes] }
      }

      it.effect("rejects nonpositive and unbounded refresh intervals", () =>
        Effect.gen(function*() {
          const mock = fixture(() => assert.fail("No discovery expected"))
          for (const refreshInterval of [0, -1, Infinity]) {
            assert.strictEqual(
              (yield* Effect.result(Sentinel.make(mock.connector, {
                _tag: "Sentinel",
                sentinels: [seed(1)],
                masterName: "service",
                refreshInterval
              })))._tag,
              "Failure"
            )
          }
          assert.deepStrictEqual(mock.counts(), [0, 0])
        }))

      it.effect("polls for promotion, notifies changes, and stops when its scope closes", () =>
        Effect.gen(function*() {
          let port = 7001
          const mock = fixture((endpoint) => endpoint.host === "sentinel" ? location(port) : master)
          const scope = yield* Scope.make()
          const topology = yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [seed(1)],
            masterName: "service",
            refreshInterval: "1 second"
          }).pipe(Scope.provide(scope))
          const promoted = yield* Deferred.make<void>()
          topology.onChange(() => {
            Deferred.doneUnsafe(promoted, Effect.void)
          })
          const resolveBeforeRefresh = topology.resolve(["PING"])
          port = 7002
          yield* TestClock.adjust("1 second")
          yield* Deferred.await(promoted)
          assert.strictEqual((yield* resolveBeforeRefresh).endpoint.port, 7002)
          yield* Scope.close(scope, Exit.void)
          const before = mock.counts()
          yield* TestClock.adjust("10 seconds")
          assert.deepStrictEqual(mock.counts(), before)
          assert.deepStrictEqual(before, [4, 4])
        }))

      it.effect("times out a silent discovery seed and proceeds to the next seed", () =>
        Effect.gen(function*() {
          const mock = fixture((endpoint, args) =>
            endpoint.port === 1 ? undefined : args[0] === "SENTINEL" ? location(7001) : master
          )
          const discovering = yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [seed(1), seed(2)],
            masterName: "service"
          }).pipe(Effect.forkChild)
          yield* TestClock.adjust("5 seconds")
          const topology = yield* Fiber.join(discovering)
          assert.strictEqual((yield* topology.resolve(["PING"])).endpoint.port, 7001)
          assert.deepStrictEqual(mock.counts(), [3, 3])
        }))

      it.effect("tries unavailable and stale seeds until a primary is verified", () =>
        Effect.gen(function*() {
          const mock = fixture((endpoint) => {
            if (endpoint.port === 1) throw new RedisError({ reason: "Connection", message: "unavailable" })
            if (endpoint.host === "sentinel") return location(endpoint.port === 2 ? 7001 : 7002)
            return endpoint.port === 7001 ? replica : master
          })
          const topology = yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [seed(1), seed(2), seed(3)],
            masterName: "service"
          })
          assert.deepStrictEqual((yield* topology.resolve(["GET", "key"])).endpoint, {
            ...primary(7002),
            tls: undefined
          })
          assert.deepStrictEqual(mock.counts(), [5, 5])
          assert.deepStrictEqual(
            mock.commands.filter(([, args]) => args[0] === "ROLE").map(([endpoint]) => endpoint.port),
            [7001, 7002]
          )
        }))

      it.effect("keeps discovery credentials separate from data credentials and initialization", () =>
        Effect.gen(function*() {
          const mock = fixture((_endpoint, args) =>
            args[0] === "SENTINEL" ? location(7001) : args[0] === "ROLE" ? master : "+OK\r\n"
          )
          yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [seed(1)],
            masterName: "service",
            username: "discovery",
            password: Redacted.make("sentinel-secret")
          }, { username: "data", password: "redis-secret", database: 2, protocol: 3 })
          const discovery = mock.commands.filter(([endpoint]) => endpoint.host === "sentinel").map(([, args]) => args)
          const data = mock.commands.filter(([endpoint]) => endpoint.host === "redis").map(([, args]) => args)
          assert.deepStrictEqual(discovery, [["AUTH", "discovery", "sentinel-secret"], ["HELLO", "3"], [
            "SENTINEL",
            "get-master-addr-by-name",
            "service"
          ]])
          assert.deepStrictEqual(data, [["AUTH", "data", "redis-secret"], ["HELLO", "3"], ["SELECT", "2"], ["ROLE"]])
          assert.deepStrictEqual(mock.counts(), [2, 2])
        }))

      it.effect("updates the endpoint only after promotion is verified", () =>
        Effect.gen(function*() {
          let port = 7001
          let role = master
          const mock = fixture((endpoint) => endpoint.host === "sentinel" ? location(port) : role)
          const topology = yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [seed(1)],
            masterName: "service"
          })
          port = 7002
          role = replica
          assert.strictEqual((yield* Effect.result(topology.refresh))._tag, "Failure")
          assert.strictEqual((yield* topology.resolve(["PING"])).endpoint.port, 7001)
          role = master
          yield* topology.refresh
          assert.strictEqual((yield* topology.resolve(["PING"])).endpoint.port, 7002)
          assert.strictEqual(topology.endpoints()[0].port, 7002)
          assert.deepStrictEqual(mock.counts(), [6, 6])
        }))

      it.effect("rejects malformed discovery replies and releases every temporary socket", () =>
        Effect.gen(function*() {
          for (
            const wire of [
              "$-1\r\n",
              "*0\r\n",
              `*2\r\n${blob("redis")}${blob("65536")}`,
              `*2\r\n${blob("redis")}${blob("1.5")}`
            ]
          ) {
            const mock = fixture(() => wire)
            const result = yield* Effect.result(
              Sentinel.make(mock.connector, { _tag: "Sentinel", sentinels: [seed(1)], masterName: "service" })
            )
            assert.strictEqual(result._tag, "Failure")
            if (result._tag === "Failure") assert.strictEqual(result.failure.outcome, "NotSent")
            assert.deepStrictEqual(mock.counts(), [1, 1])
          }
        }))

      it.effect("maps advertised addresses and configures discovery and data TLS independently", () =>
        Effect.gen(function*() {
          const mock = fixture((_endpoint, args) => args[0] === "SENTINEL" ? location(7001) : master)
          const topology = yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [{ ...seed(1), tls: { ca: "discovery-ca" } }],
            masterName: "service",
            dataTls: { ca: "data-ca" },
            mapAddress: (endpoint) => ({ ...endpoint, host: "mapped" })
          })
          assert.deepStrictEqual((yield* topology.resolve(["PING"])).endpoint, {
            host: "mapped",
            port: 7001,
            tls: { ca: "data-ca" }
          })
          assert.deepStrictEqual(mock.commands[0][0].tls, { ca: "discovery-ca" })
          assert.deepStrictEqual(mock.commands[1][0].tls, { ca: "data-ca" })
        }))

      it.effect("rejects missing discovery configuration before opening sockets", () =>
        Effect.gen(function*() {
          const mock = fixture(() => assert.fail("No discovery expected"))
          assert.strictEqual(
            (yield* Effect.result(
              Sentinel.make(mock.connector, { _tag: "Sentinel", sentinels: [], masterName: "service" })
            ))._tag,
            "Failure"
          )
          assert.strictEqual(
            (yield* Effect.result(
              Sentinel.make(mock.connector, { _tag: "Sentinel", sentinels: [seed(1)], masterName: "" })
            ))._tag,
            "Failure"
          )
          assert.deepStrictEqual(mock.counts(), [0, 0])
        }))

      it.effect("validates mapped primary addresses before connecting to the data server", () =>
        Effect.gen(function*() {
          for (const endpoint of [primary(0), primary(65536), primary(1.5), { ...primary(7001), host: "bad host" }]) {
            const mock = fixture((_endpoint, args) => args[0] === "SENTINEL" ? location(7001) : master)
            const result = yield* Effect.result(Sentinel.make(mock.connector, {
              _tag: "Sentinel",
              sentinels: [seed(1)],
              masterName: "service",
              mapAddress: () => endpoint
            }))
            assert.strictEqual(result._tag, "Failure")
            if (result._tag === "Failure") assert.strictEqual(result.failure.outcome, "NotSent")
            assert.deepStrictEqual(mock.counts(), [1, 1])
            assert.strictEqual(mock.commands.length, 1)
          }
        }))
    })
  })
})
