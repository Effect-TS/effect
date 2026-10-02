import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
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
import * as Result from "effect/Result"
import * as TestClock from "effect/testing/TestClock"
import { array, barrier, bulk, type Request, startScriptedRedis } from "./utils/redis-scripted.ts"

const server = (handle: (request: Request) => void) =>
  Effect.acquireRelease(
    Effect.promise(() => startScriptedRedis(handle)),
    (fixture) => Effect.promise(fixture.stop)
  )

const standalone = (endpoint: Endpoint) => Client.make(makeConnector(), { topology: { _tag: "Standalone", endpoint } })
const cluster = (seed: Endpoint) => Client.make(makeConnector(), { topology: { _tag: "Cluster", seeds: [seed] } })

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
          write: (bytes: string | Uint8Array) =>
            Effect.try({
              try: () => {
                // Commands in these tests are ASCII, so bulk payloads sit on every other line.
                const lines = (typeof bytes === "string" ? bytes : Buffer.from(bytes).toString()).split("\r\n")
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
          { reconnectDelay: NaN },
          { topology: { _tag: "Cluster", seeds: [] } },
          { topology: { _tag: "Cluster", seeds: [seed], maxRedirects: -1 } },
          { topology: { _tag: "Cluster", seeds: [seed] }, database: 1 },
          { topology: { _tag: "Sentinel", sentinels: [], masterName: "service" } },
          { topology: { _tag: "Sentinel", sentinels: [seed], masterName: "service", refreshInterval: 0 } }
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
        const client = yield* standalone(fixture)
        for (
          const command of [["SELECT", "1"], ["CLIENT", "REPLY", "OFF"], ["XREAD", "BLOCK", "0", "STREAMS", "s", "$"]]
        ) {
          rejected(yield* Effect.result(client.execute(command)))
        }
        assert.deepStrictEqual(requests, [["PING"]])
      }))

    it.live("does not replay uncertain writes and reconnects for later commands", () =>
      Effect.gen(function*() {
        let lost = 0
        const fixture = yield* server((request) => {
          const [command, key] = args(request)
          if (key === "lost") {
            lost++
            return request.connection.socket.end()
          }
          request.connection.send(command === "GET" ? bulk("value") : command === "INCR" ? ":1\r\n" : "+PONG\r\n")
        })
        const client = yield* standalone(fixture)

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
        assert.strictEqual(lost, 2)
        assert.strictEqual(fixture.connections.length, 3)
      }))

    it.live("isolates typed decode failures and keeps the connection usable", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) =>
          request.connection.send(
            args(request)[0] === "GET" ? "-WRONGTYPE Operation against wrong key type\r\n" : "+PONG\r\n"
          )
        )
        const client = yield* standalone(fixture)

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
        const client = yield* standalone(fixture)
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

    it.live("retries a shared connection whose acquisition died and shares the next attempt", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) => request.connection.send("+PONG\r\n"))
        const base = makeConnector()
        const defect = new Error("acquisition defect")
        let attempts = 0
        // "replica" is an alias for the fixture, so it gets its own shared connection.
        const connector: Connector = (endpoint) =>
          endpoint.host === "replica"
            ? Effect.suspend(() =>
              ++attempts === 1
                ? Effect.die(defect)
                : Effect.andThen(Effect.sleep("20 millis"), base({ ...endpoint, host: fixture.host }))
            )
            : base(endpoint)
        const client = yield* Client.make(connector, { topology: { _tag: "Standalone", endpoint: fixture } })
        const ping = client.execute(["PING"], { node: { host: "replica", port: fixture.port }, keyIndexes: [] })

        const exit = yield* Effect.exit(ping)
        assert.isTrue(Exit.isFailure(exit) && Cause.squash(exit.cause) === defect)
        const replies = yield* Effect.all([ping, ping, ping], { concurrency: "unbounded" }).pipe(
          Effect.timeout("2 seconds")
        )
        assert.deepStrictEqual(replies.map(Protocol.toValue), ["PONG", "PONG", "PONG"])
        assert.strictEqual(attempts, 2)
        assert.strictEqual(fixture.connections.length, 2)
      }))

    it.live("releases shared and reserved sockets when its scope closes", () =>
      Effect.gen(function*() {
        const fixture = yield* server((request) => request.connection.send("+PONG\r\n"))
        const scope = yield* Scope.make()
        const client = yield* standalone(fixture)
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
        const client = yield* cluster(source)
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
        const client = yield* cluster(source)

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
        const client = yield* cluster(source)
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
        const client = yield* cluster(source)
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

      it.effect("tries seeds in order and falls back to CLUSTER SLOTS only when CLUSTER SHARDS is unknown", () =>
        Effect.gen(function*() {
          const mock = mockConnector((endpoint, args) => {
            if (endpoint.port === 1) throw new RedisError({ reason: "Connection", message: "unavailable" })
            if (endpoint.port === 2) {
              return "-NOPERM this user has no permissions to run the 'cluster|shards' command\r\n"
            }
            return args[1] === "SHARDS"
              ? "-ERR unknown subcommand 'SHARDS'\r\n"
              : wire([[0, 8191, ["primary", 7001]], [8192, 16383, ["other", 7002]]])
          })
          const seeds = [{ ...seed, port: 1 }, { ...seed, port: 2 }, seed]
          const topology = yield* Cluster.make(mock.connector, { ...config, seeds })
          assert.deepStrictEqual(mock.commands.map(([endpoint, args]) => [endpoint.port, ...args]), [
            [1, "CLUSTER", "SHARDS"],
            [2, "CLUSTER", "SHARDS"],
            [7000, "CLUSTER", "SHARDS"],
            [7000, "CLUSTER", "SLOTS"]
          ])
          assert.strictEqual((yield* topology.resolve(["GET", "bar"])).endpoint.host, "primary")
          assert.strictEqual((yield* topology.resolve(["GET", "foo"])).endpoint.host, "other")
          const [opens, closes] = mock.counts()
          assert.strictEqual(opens, closes)
        }))

      it.effect("requires multi-key commands to share a slot", () =>
        Effect.gen(function*() {
          const topology = yield* Cluster.make(mockConnector(() => wire(shards())).connector, config)
          for (const args of [["MGET", "{bar}:a", "{bar}:b"], ["EVAL", "return 1", "2", "{bar}:a", "{bar}:b"]]) {
            assert.strictEqual((yield* topology.resolve(args)).slot, 5061)
          }
          rejected(yield* Effect.result(topology.resolve(["MGET", "foo", "bar"])))
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

    const primary = (handle: (request: Request) => void) =>
      server((request) => {
        const [command] = args(request)
        if (command === "ROLE") request.connection.send(masterRole)
        else if (command === "PING") request.connection.send("+PONG\r\n")
        else handle(request)
      })

    // Each discovery opens one Sentinel connection; an undefined primary fails discovery.
    const sentinelClient = Effect.fnUntraced(function*(current: () => Endpoint | undefined) {
      const sentinel = yield* server((request) => {
        const endpoint = current()
        request.connection.send(endpoint === undefined ? "-ERR discovery unavailable\r\n" : location(endpoint))
      })
      const client = yield* Client.make(makeConnector(), {
        topology: { _tag: "Sentinel", sentinels: [sentinel], masterName: "service", refreshInterval: "1 hour" }
      })
      return { client, sentinel }
    })

    it.live("retries a single READONLY command once on the refreshed primary", () =>
      Effect.gen(function*() {
        const nextRequests: Array<ReadonlyArray<string>> = []
        const next = yield* primary((request) => {
          nextRequests.push(args(request))
          request.connection.send(":1\r\n")
        })
        let current: Endpoint | undefined
        const oldRequests: Array<ReadonlyArray<string>> = []
        const old = yield* primary((request) => {
          oldRequests.push(args(request))
          current = next
          request.connection.send("-READONLY former primary\r\n")
        })
        current = old
        const { client, sentinel } = yield* sentinelClient(() => current)

        assert.strictEqual(yield* client.run(Command.make(["INCR", "retried"], Command.integer)), BigInt(1))
        assert.strictEqual(Protocol.toValue(yield* client.execute(["INCR", "later"])), 1)
        assert.deepStrictEqual(oldRequests, [["INCR", "retried"]])
        assert.deepStrictEqual(nextRequests, [["INCR", "retried"], ["INCR", "later"]])
        assert.strictEqual(sentinel.connections.length, 2)
      }))

    it.live("returns a failed refresh without replaying a READONLY command", () =>
      Effect.gen(function*() {
        let current: Endpoint | undefined
        const oldRequests: Array<ReadonlyArray<string>> = []
        const old = yield* primary((request) => {
          oldRequests.push(args(request))
          current = undefined
          request.connection.send("-READONLY former primary\r\n")
        })
        current = old
        const { client, sentinel } = yield* sentinelClient(() => current)

        const error = failure(yield* Effect.result(client.execute(["INCR", "counter"])))
        assert.strictEqual(error.reason, "Routing")
        assert.strictEqual(error.outcome, "NotSent")
        assert.strictEqual(error.message, "No Sentinel reported a verified primary")
        assert.deepStrictEqual(oldRequests, [["INCR", "counter"]])
        assert.strictEqual(sentinel.connections.length, 2)
      }))

    it.live("retries READONLY pipeline entries on the new primary without replaying successful or uncertain writes", () =>
      Effect.gen(function*() {
        const submitted = barrier<void>()
        const nextRequests: Array<Request> = []
        const next = yield* primary((request) => {
          nextRequests.push(request)
          if (nextRequests.length === 2) submitted.resolve()
        })
        let current: Endpoint | undefined
        const oldRequests: Array<Request> = []
        const old = yield* primary((request) => {
          oldRequests.push(request)
          if (oldRequests.length === 4) {
            current = next
            request.connection.socket.end("-READONLY former primary\r\n-READONLY former primary\r\n:1\r\n")
          }
        })
        current = old
        const { client, sentinel } = yield* sentinelClient(() => current)
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
        assert.strictEqual(sentinel.connections.length, 2)
        assert.strictEqual(oldRequests.length, 4)
        assert.strictEqual(nextRequests.length, 2)
      }))

    it.live("authenticates discovery and data connections separately and redacts both secrets", () =>
      Effect.gen(function*() {
        const dataAuth: Array<ReadonlyArray<string>> = []
        const data = yield* primary((request) => {
          dataAuth.push(args(request))
          request.connection.send("+OK\r\n")
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

      it.effect("rejects malformed or invalid primary addresses before connecting to them", () =>
        Effect.gen(function*() {
          const cases: ReadonlyArray<readonly [string, ((endpoint: Endpoint) => Endpoint)?]> = [
            ["$-1\r\n"],
            [array("redis", "65536").toString()],
            [locate(7001), (endpoint) => ({ ...endpoint, port: 0 })]
          ]
          for (const [reply, mapAddress] of cases) {
            const mock = mockConnector(() => reply)
            const result = yield* Effect.result(
              Sentinel.make(mock.connector, {
                _tag: "Sentinel",
                sentinels: [sentinelAt(1)],
                masterName: "service",
                mapAddress
              })
            )
            assert.strictEqual(failure(result).outcome, "NotSent")
            assert.deepStrictEqual(mock.counts(), [1, 1])
          }
        }))
    })
  })
})
