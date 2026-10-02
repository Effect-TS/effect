import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as Cluster from "@effect/redis/internal/cluster"
import * as Sentinel from "@effect/redis/internal/sentinel"
import type { ClusterConfig } from "@effect/redis/internal/topology"
import * as Client from "@effect/redis/RedisClient"
import * as Command from "@effect/redis/RedisCommand"
import type { Connector, Endpoint, Transport } from "@effect/redis/RedisConnection"
import { RedisError } from "@effect/redis/RedisError"
import * as Protocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, Queue, Redacted, Scope } from "effect"
import * as Result from "effect/Result"
import * as TestClock from "effect/testing/TestClock"
import { array, barrier, bulk, type Request, startScriptedRedis } from "./utils/redis-scripted.ts"

const server = (handle: (request: Request) => void) =>
  Effect.acquireRelease(
    Effect.promise(() => startScriptedRedis(handle)),
    (fixture) => Effect.promise(fixture.stop)
  )

const args = (request: Request): Array<string> => request.args.map((arg) => arg.toString())

const failure = <A>(result: Result.Result<A, RedisError>): RedisError => {
  if (result._tag !== "Failure") return assert.fail("Expected Redis failure")
  return result.failure
}

const successes = <A>(results: ReadonlyArray<Result.Result<A, RedisError>>): Array<A> =>
  results.map((result) => Result.getOrThrow(result))

const rejected = <A>(result: Result.Result<A, RedisError>): void => {
  const error = failure(result)
  assert.strictEqual(error.reason, "Routing")
  assert.strictEqual(error.outcome, "NotSent")
}

const masterRole = "*3\r\n$6\r\nmaster\r\n:0\r\n*0\r\n"
const replicaRole = "*5\r\n$5\r\nslave\r\n$5\r\nredis\r\n:7001\r\n$9\r\nconnected\r\n:0\r\n"

const clusterSlots = (endpoint: Endpoint): Buffer =>
  Buffer.concat([
    Buffer.from("*1\r\n*3\r\n:0\r\n:16383\r\n*2\r\n"),
    bulk(endpoint.host),
    Buffer.from(`:${endpoint.port}\r\n`)
  ])

const clusterDiscovery = (request: Request, endpoint: Endpoint): boolean => {
  const [command, subcommand] = args(request)
  if (command === "CLUSTER") {
    request.connection.send(subcommand === "SHARDS" ? "-ERR unknown subcommand 'SHARDS'\r\n" : clusterSlots(endpoint))
    return true
  }
  if (command === "PING") {
    request.connection.send("+PONG\r\n")
    return true
  }
  return false
}

const wireBytes = (input: Parameters<Transport["write"]>[0]): Uint8Array => {
  const parts = typeof input === "string" || input instanceof Uint8Array ? [input] : input
  return Buffer.concat(parts.map((part) => typeof part === "string" ? Buffer.from(part) : part))
}

const mockConnector = (respond: (endpoint: Endpoint, args: ReadonlyArray<string>) => string | undefined) => {
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
        Queue.failCauseUnsafe(replies, Cause.fail(new RedisError({ reason: "Closed", message: "fixture closed" })))
      })
      return yield* Effect.acquireRelease(
        Effect.succeed({
          run: (onBytes: (bytes: Uint8Array) => void) => Queue.take(replies).pipe(Effect.map(onBytes), Effect.forever),
          close,
          write: (bytes: Parameters<Transport["write"]>[0]) =>
            Effect.try({
              try: () => {
                // Commands in these tests are ASCII, so bulk payloads sit on every other line.
                const lines = Buffer.from(wireBytes(bytes)).toString().split("\r\n")
                const args: Array<string> = []
                for (let i = 2; i < lines.length - 1; i += 2) args.push(lines[i])
                commands.push([endpoint, args])
                const response = respond(endpoint, args)
                if (response !== undefined) Queue.offerUnsafe(replies, Buffer.from(response))
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
  return { connector, commands, counts: () => [opens, closes] as const }
}

describe("RedisClient", () => {
  describe("lifecycle", () => {
    it.effect("times out the initial PING and closes the transport", () =>
      Effect.gen(function*() {
        const written = yield* Deferred.make<void>()
        let closed = false
        const connector: Connector = () =>
          Effect.acquireRelease(
            Effect.succeed({
              run: () => Effect.never,
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

    it.effect("rejects invalid configuration before connecting", () =>
      Effect.gen(function*() {
        let acquisitions = 0
        const connector: Connector = () =>
          Effect.sync(() => {
            acquisitions++
            return assert.fail("No connection should be acquired")
          })
        const seed = { host: "127.0.0.1", port: 7000 }
        const configs: ReadonlyArray<Client.Config> = [
          { reconnectDelay: 0 },
          { reconnectDelay: NaN },
          { topology: { _tag: "Cluster", seeds: [] } },
          { topology: { _tag: "Cluster", seeds: [seed], maxRedirects: -1 } },
          { topology: { _tag: "Cluster", seeds: [seed] }, database: 1 },
          { topology: { _tag: "Sentinel", sentinels: [], masterName: "service" } },
          { topology: { _tag: "Sentinel", sentinels: [seed], masterName: "service", refreshInterval: 0 } },
          { topology: { _tag: "Sentinel", sentinels: [seed], masterName: "service", refreshInterval: NaN } }
        ]
        for (const config of configs) {
          rejected(yield* Effect.result(Client.make(connector, config)))
        }
        assert.strictEqual(acquisitions, 0)
      }))

    it.live("rejects connection-state and blocking commands on the shared connection", () =>
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
            ["WATCH", "key"],
            ["SELECT", "1"],
            ["SUBSCRIBE", "channel"],
            ["CLIENT", "REPLY", "OFF"],
            ["BLPOP", "list", "0"],
            ["XREAD", "BLOCK", "0", "STREAMS", "stream", "$"]
          ]
        ) {
          rejected(yield* Effect.result(client.execute(command)))
        }
        assert.deepStrictEqual(requests, [["PING"]])
      }))

    it.live("does not replay uncertain writes and reconnects for later commands", () =>
      Effect.gen(function*() {
        const requests: Array<ReadonlyArray<string>> = []
        const fixture = yield* server((request) => {
          const values = args(request)
          requests.push(values)
          if (values[0] === "INCR" && values[1] === "lost") request.connection.socket.end()
          else {request.connection.send(
              values[0] === "GET" ? bulk("value") : values[0] === "INCR" ? ":1\r\n" : "+PONG\r\n"
            )}
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })

        const error = failure(yield* Effect.result(client.execute(["INCR", "lost"])))
        assert.strictEqual(error.reason, "Connection")
        assert.strictEqual(error.outcome, "Unknown")

        const results = yield* client.pipeline([
          Command.make(["INCR", "ok"], Command.integer),
          Command.make(["INCR", "lost"], Command.integer)
        ])
        assert.strictEqual(Result.getOrThrow(results[0]), BigInt(1))
        assert.strictEqual(failure(results[1]).outcome, "Unknown")

        assert.strictEqual(yield* client.run(Command.get("key")), "value")
        assert.strictEqual(requests.filter((values) => values[1] === "lost").length, 2)
        assert.strictEqual(fixture.connections.length, 3)
      }))

    it.live("isolates typed decode failures and keeps the connection usable", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) =>
          request.connection.send(
            args(request)[0] === "GET" ? "-WRONGTYPE Operation against wrong key type\r\n" : "+PONG\r\n"
          )
        )
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })

        const defect = new Error("decoder failure")
        const exit = yield* client.run(Command.make(["PING"], () => {
          throw defect
        })).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(exit) && Cause.squash(exit.cause) === defect)

        let decoded = false
        const serverError = failure(
          yield* Effect.result(client.run(Command.make(["GET", "key"], () => {
            decoded = true
            return Result.succeed("unexpected")
          })))
        )
        assert.strictEqual(serverError.reason, "Server")
        assert.strictEqual(serverError.code, "WRONGTYPE")
        assert.isFalse(decoded)

        const decodeError = failure(yield* Effect.result(client.run(Command.make(["PING"], Command.integer))))
        assert.strictEqual(decodeError.reason, "Decode")

        assert.strictEqual(yield* client.run(Command.make(["PING"], Command.text)), "PONG")
        assert.strictEqual(fixture.connections.length, 1)
      }))

    it.live("preserves pipeline positions and submits allowed commands before replies", () =>
      Effect.gen(function*() {
        const requests: Array<Request> = []
        const submitted = barrier<void>()
        const fixture = yield* server((request) => {
          if (args(request)[0] === "PING") return request.connection.send("+PONG\r\n")
          requests.push(request)
          if (requests.length === 4) submitted.resolve()
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
        const pipeline = yield* client.pipeline([
          Command.make(["INCR", "counter"], Command.integer),
          Command.make(["MULTI"], Command.text),
          Command.get("text"),
          Command.make(["BLPOP", "queue", "0"], Command.text),
          Command.getBytes("binary"),
          Command.make(["ECHO", "text"], Command.integer)
        ]).pipe(Effect.forkChild)
        yield* Effect.promise(() => submitted.promise).pipe(Effect.timeout("1 second"))
        assert.deepStrictEqual(requests.map(args), [["INCR", "counter"], ["GET", "text"], ["GET", "binary"], [
          "ECHO",
          "text"
        ]])
        const bytes = new Uint8Array([0, 128, 255])
        requests[0].connection.send(Buffer.concat([Buffer.from(":1\r\n"), bulk("value"), bulk(bytes), bulk("text")]))

        const results = yield* Fiber.join(pipeline)
        assert.strictEqual(Result.getOrThrow(results[0]), BigInt(1))
        rejected(results[1])
        assert.strictEqual(Result.getOrThrow(results[2]), "value")
        rejected(results[3])
        assert.deepStrictEqual(Result.getOrThrow(results[4]), bytes)
        assert.strictEqual(failure(results[5]).reason, "Decode")
        assert.deepStrictEqual(yield* client.pipeline([]), [])
      }))

    it.live("shares an in-progress connection attempt and retries one that failed", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) => request.connection.send("+PONG\r\n"))
        const base = makeConnector()
        let attempts = 0
        // "replica" is an alias for the fixture, so it gets its own shared connection.
        const connector: Connector = (endpoint) =>
          endpoint.host === "replica"
            ? Effect.suspend(() =>
              ++attempts === 1
                ? Effect.fail(new RedisError({ reason: "Connection", message: "unavailable", outcome: "NotSent" }))
                : Effect.andThen(Effect.sleep("20 millis"), base({ ...endpoint, host: fixture.host }))
            )
            : base(endpoint)
        const client = yield* Client.make(connector, { topology: { _tag: "Standalone", endpoint: fixture } })
        const replica = { host: "replica", port: fixture.port }

        const error = failure(yield* Effect.result(client.execute(["PING"], { node: replica, keyIndexes: [] })))
        assert.strictEqual(error.reason, "Connection")

        const replies = yield* Effect.all(
          [0, 1, 2].map(() => client.execute(["PING"], { node: replica, keyIndexes: [] })),
          { concurrency: "unbounded" }
        )
        assert.deepStrictEqual(replies.map(Protocol.toValue), ["PONG", "PONG", "PONG"])
        assert.strictEqual(attempts, 2)
        assert.strictEqual(fixture.connections.length, 2)
      }))

    it.live("retries a shared connection whose acquisition died", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) => request.connection.send("+PONG\r\n"))
        const base = makeConnector()
        const defect = new Error("acquisition defect")
        let attempts = 0
        const connector: Connector = (endpoint) =>
          endpoint.host === "replica"
            ? Effect.suspend(() => ++attempts === 1 ? Effect.die(defect) : base({ ...endpoint, host: fixture.host }))
            : base(endpoint)
        const client = yield* Client.make(connector, { topology: { _tag: "Standalone", endpoint: fixture } })
        const replica = { host: "replica", port: fixture.port }

        const first = yield* Effect.exit(client.execute(["PING"], { node: replica, keyIndexes: [] }))
        assert.isTrue(Exit.isFailure(first) && Cause.squash(first.cause) === defect)
        const second = yield* client.execute(["PING"], { node: replica, keyIndexes: [] }).pipe(
          Effect.timeout("2 seconds")
        )
        assert.strictEqual(Protocol.toValue(second), "PONG")
        assert.strictEqual(attempts, 2)
      }))

    it.live("releases shared and reserved sockets when its scope closes", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) => request.connection.send("+PONG\r\n"))
        const scope = yield* Scope.make()
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint: fixture } })
          .pipe(Scope.provide(scope))
        const reserved = yield* client.reserve().pipe(Scope.provide(scope))
        yield* reserved.execute(["PING"])
        assert.strictEqual(fixture.connections.length, 2)
        const closed = fixture.connections.map((connection) =>
          new Promise<void>((resolve) => connection.socket.once("close", resolve))
        )

        yield* Scope.close(scope, Exit.void)
        yield* client.closed
        yield* Effect.promise(() => Promise.all(closed)).pipe(Effect.timeout("1 second"))
        assert.strictEqual(failure(yield* Effect.result(client.execute(["PING"]))).reason, "Closed")
        assert.strictEqual(failure(yield* Effect.result(client.reserve())).reason, "Closed")
        assert.strictEqual(fixture.connections.length, 2)
      }))
  })

  describe("Cluster", () => {
    it.live("follows MOVED and caches the new slot owner", () =>
      Effect.gen(function*() {
        const targetGets: Array<ReadonlyArray<string>> = []
        const target = yield* server((request) => {
          const values = args(request)
          if (values[0] === "GET") targetGets.push(values)
          request.connection.send(values[0] === "GET" ? bulk("value") : "+PONG\r\n")
        })
        const sourceGets: Array<ReadonlyArray<string>> = []
        const source = yield* server((request) => {
          if (clusterDiscovery(request, source)) return
          sourceGets.push(args(request))
          request.connection.send(`-MOVED 5061 ${target.host}:${target.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [source] } })
        assert.strictEqual(yield* client.run(Command.get("bar")), "value")
        assert.strictEqual(yield* client.run(Command.get("bar")), "value")
        assert.deepStrictEqual(sourceGets, [["GET", "bar"]])
        assert.deepStrictEqual(targetGets, [["GET", "bar"], ["GET", "bar"]])
      }))

    it.live("sends ASKING and the redirected command on one exclusive connection without caching", () =>
      Effect.gen(function*() {
        const asking = barrier<Request>()
        let held = false
        const targetRequests: Array<readonly [number, string]> = []
        const target = yield* server((request) => {
          const [command] = args(request)
          targetRequests.push([request.connection.number, command])
          if (command === "ASKING" && !held) {
            held = true
            asking.resolve(request)
          } else {
            request.connection.send(command === "GET" ? bulk("value") : command === "ASKING" ? "+OK\r\n" : "+PONG\r\n")
          }
        })
        let sourceGets = 0
        const source = yield* server((request) => {
          if (clusterDiscovery(request, source)) return
          sourceGets++
          request.connection.send(`-ASK 5061 ${target.host}:${target.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [source] } })

        const redirected = yield* client.run(Command.get("bar")).pipe(Effect.forkChild)
        const askingRequest = yield* Effect.promise(() => asking.promise)
        assert.strictEqual(Protocol.toValue(yield* client.execute(["PING"], { node: target, keyIndexes: [] })), "PONG")
        askingRequest.connection.send("+OK\r\n")
        assert.strictEqual(yield* Fiber.join(redirected), "value")

        const exclusive = askingRequest.connection.number
        assert.strictEqual(targetRequests.find(([, command]) => command === "GET")![0], exclusive)
        assert.notStrictEqual(targetRequests.find(([, command]) => command === "PING")![0], exclusive)

        assert.strictEqual(yield* client.run(Command.get("bar")), "value")
        assert.strictEqual(sourceGets, 2)
      }))

    it.live("bounds MOVED and ASK redirects by maxRedirects", () =>
      Effect.gen(function*() {
        const submitted = { moved: 0, ask: 0 }
        const fixture = yield* server((request) => {
          if (clusterDiscovery(request, fixture)) return
          const [command, key] = args(request)
          if (command === "ASKING") return request.connection.send("+OK\r\n")
          const redirect = key === "moved" ? "MOVED" : "ASK"
          submitted[key as keyof typeof submitted]++
          request.connection.send(`-${redirect} ${Cluster.keySlot(key)} ${fixture.host}:${fixture.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), {
          topology: { _tag: "Cluster", seeds: [fixture], maxRedirects: 2 }
        })
        for (const [key, code] of [["moved", "MOVED"], ["ask", "ASK"]] as const) {
          const error = failure(yield* Effect.result(client.execute(["INCR", key])))
          assert.strictEqual(error.reason, "Routing")
          assert.strictEqual(error.code, code)
        }
        assert.deepStrictEqual(submitted, { moved: 3, ask: 3 })
      }))

    it.live("keeps earlier ASK pipeline results when a later ASKING fails", () =>
      Effect.gen(function*() {
        const targetRequests: Array<Array<string>> = []
        const target = yield* server((request) => {
          targetRequests.push(args(request))
          const [command] = args(request)
          if (command === "INCR") return request.connection.send(":1\r\n")
          // The first ASKING succeeds; the connection drops on the second one.
          if (targetRequests.filter(([command]) => command === "ASKING").length === 1) {
            request.connection.send("+OK\r\n")
          } else {
            request.connection.disconnect()
          }
        })
        const source = yield* server((request) => {
          if (clusterDiscovery(request, source)) return
          request.connection.send(`-ASK 5061 ${target.host}:${target.port}\r\n`)
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [source] } })
        const results = yield* client.pipeline([
          Command.make(["INCR", "{bar}:first"], Command.integer),
          Command.make(["INCR", "{bar}:second"], Command.integer)
        ])
        assert.deepStrictEqual(successes(results.slice(0, 1)), [BigInt(1)])
        assert.strictEqual(failure(results[1]).reason, "Connection")
        assert.deepStrictEqual(targetRequests, [["ASKING"], ["INCR", "{bar}:first"], ["ASKING"]])
      }))

    it.live("retries MOVED pipeline entries without replaying successful or uncertain writes", () =>
      Effect.gen(function*() {
        const targetRequests: Array<Request> = []
        const submitted = barrier<void>()
        const target = yield* server((request) => {
          targetRequests.push(request)
          if (targetRequests.length === 2) submitted.resolve()
        })
        const sourceRequests: Array<Request> = []
        const source = yield* server((request) => {
          if (clusterDiscovery(request, source)) return
          sourceRequests.push(request)
          if (sourceRequests.length === 4) {
            const moved = `-MOVED 5061 ${target.host}:${target.port}\r\n`
            request.connection.socket.end(moved + moved + ":1\r\n")
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
        assert.deepStrictEqual(successes(results.slice(0, 3)), [BigInt(1), BigInt(1), BigInt(1)])
        assert.strictEqual(failure(results[3]).outcome, "Unknown")
        assert.strictEqual(sourceRequests.length, 4)
        assert.strictEqual(targetRequests.length, 2)
      }))

    it.live("rejects a cross-slot reserved pipeline before sending any command", () =>
      Effect.gen(function*() {
        const requests: Array<ReadonlyArray<string>> = []
        const fixture = yield* server((request) => {
          if (clusterDiscovery(request, fixture)) return
          requests.push(args(request))
          request.connection.send("+OK\r\n")
        })
        const client = yield* Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [fixture] } })
        const reserved = yield* client.reserve({ key: "bar" })
        const error = failure(
          yield* Effect.result(reserved.pipeline([
            { arguments: ["MULTI"] },
            { arguments: ["SET", "foo", "value"] },
            { arguments: ["EXEC"] }
          ]))
        )
        assert.strictEqual(error.code, "CROSSSLOT")
        assert.strictEqual(error.outcome, "NotSent")
        assert.deepStrictEqual(requests, [])
      }))

    describe("topology", () => {
      const seed: Endpoint = { host: "seed", port: 7000 }
      const config: ClusterConfig = { _tag: "Cluster", seeds: [seed] }

      const wire = (value: unknown): string => {
        if (typeof value === "string") return `$${Buffer.byteLength(value)}\r\n${value}\r\n`
        if (typeof value === "number") return `:${value}\r\n`
        if (value === null) return "$-1\r\n"
        if (Array.isArray(value)) return `*${value.length}\r\n${value.map(wire).join("")}`
        throw new Error("Unsupported fixture value")
      }
      const reply = (value: unknown): Protocol.Reply => Protocol.makeParser().push(Buffer.from(wire(value)))[0]
      const shards = (host = "primary", port = 7001): ReadonlyArray<unknown> => [
        ["slots", [0, 8191], "nodes", [
          ["id", "replica-a", "role", "replica", "health", "online", "ip", "replica", "port", 7101],
          ["id", "primary-a", "role", "master", "health", "online", "ip", host, "port", port]
        ]],
        ["slots", [8192, 16383], "nodes", [
          ["id", "primary-b", "role", "master", "health", "online", "ip", "other", "port", 7002]
        ]]
      ]

      it("computes key slots with CRC16 and hash tags", () => {
        assert.strictEqual(Cluster.crc16(Buffer.from("123456789")), 0x31c3)
        assert.strictEqual(Cluster.keySlot("foo"), 12182)
        assert.strictEqual(Cluster.keySlot("bar"), 5061)
        assert.strictEqual(Cluster.keySlot("{bar}:one"), 5061)
        assert.strictEqual(Cluster.keySlot("foo{}{bar}"), 8363)
        assert.strictEqual(Cluster.keySlot("foo{{bar}}"), 4015)
        assert.strictEqual(Cluster.keySlot(Buffer.from("é{bar}☃")), 5061)
      })

      it("parses CLUSTER SHARDS primaries and ignores replicas", () => {
        const discovery = Cluster.parseShards(reply(shards()), seed, config)
        assert.deepStrictEqual(discovery.primaries, [
          { host: "primary", port: 7001, tls: undefined },
          { host: "other", port: 7002, tls: undefined }
        ])
        assert.strictEqual(discovery.owners[8191].port, 7001)
        assert.strictEqual(discovery.owners[8192].port, 7002)
      })

      it("parses CLUSTER SLOTS with seed host fallback and address mapping", () => {
        const discovery = Cluster.parseSlots(reply([[0, 8191, [null, 7001]], [8192, 16383, ["other", 7002]]]), seed, {
          ...config,
          mapAddress: (endpoint) => ({ ...endpoint, port: endpoint.port + 1000 })
        })
        assert.deepStrictEqual(discovery.primaries, [
          { host: "seed", port: 8001, tls: undefined },
          { host: "other", port: 8002, tls: undefined }
        ])
      })

      it("rejects malformed topology", () => {
        for (
          const value of [
            [[0, 100, ["primary", 7001]]],
            [[0, 16383, ["primary", 7001]], [1, 2, ["other", 7002]]],
            [[0, 16383, ["primary", 0]]]
          ]
        ) assert.throws(() => Cluster.parseSlots(reply(value), seed, config))
        const loading = ["role", "master", "health", "loading", "ip", "primary", "port", 7001]
        assert.throws(() => Cluster.parseShards(reply([["slots", [0, 16383], "nodes", [loading]]]), seed, config))
      })

      it.effect("does not fall back to CLUSTER SLOTS when CLUSTER SHARDS is denied", () =>
        Effect.gen(function*() {
          const mock = mockConnector(() =>
            "-NOPERM this user has no permissions to run the 'cluster|shards' command\r\n"
          )
          rejected(yield* Effect.result(Cluster.make(mock.connector, config)))
          assert.deepStrictEqual(mock.commands.map(([, args]) => args), [["CLUSTER", "SHARDS"]])
        }))

      it.effect("tries seeds in order and falls back to CLUSTER SLOTS", () =>
        Effect.gen(function*() {
          const mock = mockConnector((endpoint, args) => {
            if (endpoint.port === 1) throw new RedisError({ reason: "Connection", message: "unavailable" })
            return args[1] === "SHARDS"
              ? "-ERR unknown subcommand 'SHARDS'\r\n"
              : wire([[0, 8191, ["primary", 7001]], [8192, 16383, ["other", 7002]]])
          })
          const topology = yield* Cluster.make(mock.connector, { ...config, seeds: [{ ...seed, port: 1 }, seed] })
          assert.deepStrictEqual(mock.commands.map(([, args]) => args), [
            ["CLUSTER", "SHARDS"],
            ["CLUSTER", "SHARDS"],
            ["CLUSTER", "SLOTS"]
          ])
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.host, "primary")
          assert.strictEqual((yield* topology.resolve(["GET", "foo"])).endpoint.host, "other")
          const [opens, closes] = mock.counts()
          assert.strictEqual(opens, closes)
        }))

      it.effect("requires multi-key commands to share a slot", () =>
        Effect.gen(function*() {
          const topology = yield* Cluster.make(mockConnector(() => wire(shards())).connector, config)
          for (
            const args of [
              ["MGET", "{bar}:a", "{bar}:b"],
              ["EVAL", "return 1", "2", "{bar}:a", "{bar}:b"],
              ["XREAD", "STREAMS", "{bar}:a", "{bar}:b", "0", "0"]
            ]
          ) assert.strictEqual((yield* topology.resolve(args)).slot, 5061)
          rejected(yield* Effect.result(topology.resolve(["MGET", "foo", "bar"])))
          rejected(yield* Effect.result(topology.resolve(["EVAL", "return 1", "2", "foo", "bar"])))
          rejected(yield* Effect.result(topology.resolve(["MODULE.CMD", "key"])))
          assert.strictEqual((yield* topology.resolve(["MODULE.CMD", "bar"], { keyIndexes: [1] })).slot, 5061)
        }))

      it.effect("refreshes after failover and keeps the last valid topology on failure", () =>
        Effect.gen(function*() {
          let promoted = false
          let unavailable = false
          const mock = mockConnector(() => {
            if (unavailable) throw new RedisError({ reason: "Connection", message: "unavailable" })
            return wire(promoted ? shards("promoted", 8001) : shards())
          })
          const topology = yield* Cluster.make(mock.connector, config)
          promoted = true
          yield* topology.refresh
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.host, "promoted")
          unavailable = true
          rejected(yield* Effect.result(topology.refresh))
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.host, "promoted")
        }))
    })
  })

  describe("Sentinel", () => {
    const location = (endpoint: Endpoint) => array(endpoint.host, String(endpoint.port))

    it.live("rejects writes safely after promotion without replaying successful or uncertain commands", () =>
      Effect.gen(function*() {
        const submitted = barrier<void>()
        const nextRequests: Array<Request> = []
        const next = yield* server((request) => {
          if (args(request)[0] === "ROLE") return request.connection.send(masterRole)
          nextRequests.push(request)
          if (nextRequests.length === 2) submitted.resolve()
        })
        let promoted = false
        const oldRequests: Array<Request> = []
        const old = yield* server((request) => {
          const [command] = args(request)
          if (command === "ROLE") return request.connection.send(masterRole)
          if (command === "PING") return request.connection.send("+PONG\r\n")
          oldRequests.push(request)
          if (oldRequests.length === 4) {
            promoted = true
            request.connection.socket.end("-READONLY former primary\r\n-READONLY former primary\r\n:1\r\n")
          }
        })
        let discoveries = 0
        const sentinel = yield* server((request) => {
          discoveries++
          request.connection.send(location(promoted ? next : old))
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
        assert.deepStrictEqual(successes(results.slice(0, 3)), [BigInt(1), BigInt(1), BigInt(1)])
        assert.strictEqual(failure(results[3]).outcome, "Unknown")
        assert.strictEqual(discoveries, 2)
        assert.strictEqual(oldRequests.length, 4)
        assert.strictEqual(nextRequests.length, 2)
      }))

    it.live("authenticates discovery and data connections separately and redacts both secrets", () =>
      Effect.gen(function*() {
        const dataAuth: Array<ReadonlyArray<string>> = []
        const data = yield* server((request) => {
          const values = args(request)
          if (values[0] === "AUTH") dataAuth.push(values)
          request.connection.send(values[0] === "ROLE" ? masterRole : "+OK\r\n")
        })
        const sentinelAuth: Array<ReadonlyArray<string>> = []
        const sentinel = yield* server((request) => {
          const values = args(request)
          if (values[0] === "AUTH") {
            sentinelAuth.push(values)
            request.connection.send("+OK\r\n")
          } else {
            request.connection.send(location(data))
          }
        })
        const client = yield* Client.make(makeConnector(), {
          username: "data",
          password: "data-secret",
          topology: {
            _tag: "Sentinel",
            sentinels: [sentinel],
            masterName: "service",
            username: "discovery",
            password: "sentinel-secret"
          }
        })
        assert.deepStrictEqual(sentinelAuth, [["AUTH", "discovery", "sentinel-secret"]])
        assert.isNotEmpty(dataAuth)
        assert.isTrue(dataAuth.every((command) => command[1] === "data" && command[2] === "data-secret"))

        assert.isTrue(Redacted.isRedacted(client.config.password))
        const topology = client.config.topology
        assert.isTrue(topology?._tag === "Sentinel" && Redacted.isRedacted(topology.password))
        const serialized = JSON.stringify(client.config)
        assert.notInclude(serialized, "data-secret")
        assert.notInclude(serialized, "sentinel-secret")
      }))

    describe("discovery", () => {
      const sentinelAt = (port: number): Endpoint => ({ host: "sentinel", port })
      const locate = (port: number) => location({ host: "redis", port }).toString()

      it.effect("tries seeds in order until a reported primary verifies its role", () =>
        Effect.gen(function*() {
          const mock = mockConnector((endpoint) => {
            if (endpoint.port === 1) throw new RedisError({ reason: "Connection", message: "unavailable" })
            if (endpoint.host === "sentinel") return locate(endpoint.port === 2 ? 7001 : 7002)
            return endpoint.port === 7001 ? replicaRole : masterRole
          })
          const topology = yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [sentinelAt(1), sentinelAt(2), sentinelAt(3)],
            masterName: "service"
          })
          assert.strictEqual((yield* topology.resolve(["GET", "key"])).endpoint.port, 7002)
          assert.deepStrictEqual(
            mock.commands.filter(([, args]) => args[0] === "ROLE").map(([endpoint]) => endpoint.port),
            [7001, 7002]
          )
          const [opens, closes] = mock.counts()
          assert.strictEqual(opens, closes)
        }))

      it.effect("polls for promotion and stops polling when its scope closes", () =>
        Effect.gen(function*() {
          let port = 7001
          const mock = mockConnector((endpoint) => endpoint.host === "sentinel" ? locate(port) : masterRole)
          const scope = yield* Scope.make()
          const topology = yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [sentinelAt(1)],
            masterName: "service",
            refreshInterval: "1 second"
          }).pipe(Scope.provide(scope))
          const changed = yield* Deferred.make<void>()
          topology.onChange(() => Deferred.doneUnsafe(changed, Effect.void))

          port = 7002
          yield* TestClock.adjust("1 second")
          yield* Deferred.await(changed)
          assert.strictEqual((yield* topology.resolve(["PING"])).endpoint.port, 7002)

          yield* Scope.close(scope, Exit.void)
          const before = mock.counts()
          yield* TestClock.adjust("10 seconds")
          assert.deepStrictEqual(mock.counts(), before)
        }))

      it.effect("applies dataTls and mapAddress to the discovered primary", () =>
        Effect.gen(function*() {
          const mock = mockConnector((endpoint) => endpoint.host === "sentinel" ? locate(7001) : masterRole)
          const topology = yield* Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [sentinelAt(1)],
            masterName: "service",
            dataTls: { ca: "data-ca" },
            mapAddress: (endpoint) => ({ ...endpoint, host: "mapped" })
          })
          const primary = { host: "mapped", port: 7001, tls: { ca: "data-ca" } }
          assert.deepStrictEqual((yield* topology.resolve(["PING"])).endpoint, primary)
          assert.deepStrictEqual(mock.commands.find(([, args]) => args[0] === "ROLE")?.[0], primary)
          assert.strictEqual(mock.commands.find(([, args]) => args[0] === "SENTINEL")?.[0].tls, undefined)
        }))

      it.effect("rejects an invalid mapped primary address before connecting to it", () =>
        Effect.gen(function*() {
          const mock = mockConnector(() => locate(7001))
          const result = yield* Effect.result(Sentinel.make(mock.connector, {
            _tag: "Sentinel",
            sentinels: [sentinelAt(1)],
            masterName: "service",
            mapAddress: (endpoint) => ({ ...endpoint, port: 0 })
          }))
          assert.strictEqual(failure(result).outcome, "NotSent")
          assert.deepStrictEqual(mock.counts(), [1, 1])
        }))

      it.effect("rejects malformed discovery replies", () =>
        Effect.gen(function*() {
          for (const reply of ["$-1\r\n", array("redis", "65536").toString()]) {
            const mock = mockConnector(() => reply)
            const result = yield* Effect.result(
              Sentinel.make(mock.connector, { _tag: "Sentinel", sentinels: [sentinelAt(1)], masterName: "service" })
            )
            assert.strictEqual(failure(result).outcome, "NotSent")
            assert.deepStrictEqual(mock.counts(), [1, 1])
          }
        }))
    })
  })
})
