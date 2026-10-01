import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as ConnectionInternal from "@effect/redis/internal/connection"
import * as Connection from "@effect/redis/RedisConnection"
import type { RedisError } from "@effect/redis/RedisError"
import * as Protocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Queue, Scope } from "effect"
import type * as Result from "effect/Result"
import * as TestClock from "effect/testing/TestClock"
import { Duplex } from "node:stream"
import { array, bulk, startScriptedRedis } from "./utils/redis-scripted.ts"

const server = Effect.acquireRelease(
  Effect.promise(() => startScriptedRedis()),
  (server) => Effect.promise(() => server.stop())
)
const failure = <A>(result: Result.Result<A, RedisError>): RedisError => {
  assert.strictEqual(result._tag, "Failure")
  if (result._tag !== "Failure") return assert.fail("Expected Redis failure")
  return result.failure
}
const wireBytes = (bytes: Parameters<Connection.Transport["write"]>[0]): Uint8Array =>
  typeof bytes === "string" ? Buffer.from(bytes) : Array.isArray(bytes)
    ? Buffer.concat(bytes.map((part) => Buffer.from(part)))
    : bytes as Uint8Array

describe("Redis physical session", () => {
  it.effect("captures current command arguments on every submission", () =>
    Effect.gen(function*() {
      const replies = yield* Queue.unbounded<Uint8Array, RedisError>()
      const requests = Protocol.makeParser()
      let captured: Protocol.Reply | undefined
      const connector: Connection.Connector = () =>
        Effect.succeed({
          run: (onBytes) => Effect.forever(Queue.take(replies).pipe(Effect.map(onBytes))),
          close: Effect.void,
          write: (bytes) =>
            Effect.sync(() => {
              captured = requests.push(wireBytes(bytes))[0]
              Queue.offerUnsafe(replies, Buffer.from("+OK\r\n"))
            })
        })
      const connection = yield* Connection.make(connector, { host: "unused", port: 6379 })
      const submit = ConnectionInternal.get(connection)
      assert.isDefined(submit)
      if (submit === undefined) return assert.fail("Expected concrete command submission")
      const completed = yield* Deferred.make<Protocol.Reply | RedisError>()
      const bytes = new Uint8Array([0, 128, 255])
      submit(["SET", "binary", bytes], (result) => {
        Deferred.doneUnsafe(completed, Effect.succeed(result))
      })
      bytes.fill(99)
      assert.strictEqual((yield* Deferred.await(completed))._tag, "SimpleString")
      assert.strictEqual(captured?._tag, "Array")
      if (captured?._tag === "Array") {
        assert.deepStrictEqual(captured.values[2], { _tag: "BlobString", value: new Uint8Array([0, 128, 255]) })
      }
      const args: Array<Protocol.Argument> = ["ECHO", "first"]
      const command = connection.execute(args)
      for (
        const value of [
          "first",
          "🥹\uD800",
          "last",
          "first",
          ...Array.from({ length: 32 }, (_, index) => `${index}`)
        ]
      ) {
        args[1] = value
        yield* command
        assert.deepStrictEqual(Protocol.toValue(captured!), ["ECHO", value.replace("\uD800", "�")])
      }
      args[1] = "x".repeat(4096)
      yield* command
      assert.deepStrictEqual(Protocol.toValue(captured!), args)
      args[1] = "first"
      args.push("extra")
      yield* command
      assert.deepStrictEqual(Protocol.toValue(captured!), args)
      args.pop()
      yield* command
      assert.deepStrictEqual(Protocol.toValue(captured!), args)
      args.splice(0, args.length, "CLIENT", "SETNAME", "name")
      yield* command
      const last = captured
      args[1] = "REPLY"
      args[2] = "OFF"
      const invalid = failure(yield* Effect.result(command))
      assert.strictEqual(invalid.reason, "Routing")
      assert.strictEqual(invalid.outcome, "NotSent")
      assert.strictEqual(captured, last)
      args[1] = "SETNAME"
      args[2] = "updated"
      yield* command
      assert.deepStrictEqual(Protocol.toValue(captured!), args)
    }))

  it.effect("keeps repeated command and pipeline effects independent with immediate replies", () =>
    Effect.gen(function*() {
      const replies = yield* Queue.unbounded<Uint8Array, RedisError>()
      const requests = Protocol.makeParser()
      let counter = 0
      let writes = 0
      const connection = yield* Connection.make(
        () =>
          Effect.succeed({
            run: (onBytes) => Effect.forever(Queue.take(replies).pipe(Effect.map(onBytes))),
            close: Effect.void,
            write: (bytes) =>
              Effect.sync(() => {
                writes++
                const response = requests.push(wireBytes(bytes)).map(() => `:${++counter}\r\n`).join("")
                Queue.offerUnsafe(replies, Buffer.from(response))
              })
          }),
        { host: "unused", port: 6379 }
      )
      const command = connection.execute(["INCR", "counter"])
      const individual = yield* Effect.all([command, command], { concurrency: "unbounded" })
      assert.deepStrictEqual(individual.map(Protocol.toValue), [1, 2])
      assert.strictEqual(writes, 1)
      const pipeline = connection.pipeline([
        { arguments: ["INCR", "counter"] },
        { arguments: ["INCR", "counter"] }
      ])
      const batches = yield* Effect.all([pipeline, pipeline], { concurrency: "unbounded" })
      assert.deepStrictEqual(
        batches.map((batch) =>
          batch.map((result) => {
            assert.strictEqual(result._tag, "Success")
            return result._tag === "Success" ? Protocol.toValue(result.success) : undefined
          })
        ),
        [[3, 4], [5, 6]]
      )
      assert.strictEqual(writes, 2)
    }))

  it.live("allows other fibers to progress during synchronous and microtask reply chains", () =>
    Effect.gen(function*() {
      for (const microtaskReplies of [false, true]) {
        const requests = Protocol.makeParser()
        const completed = yield* Deferred.make<Array<number>, RedisError>()
        const values: Array<number> = []
        let onBytes: ((bytes: Uint8Array) => void) | undefined
        let counter = 0
        const connection = yield* Connection.make(
          () =>
            Effect.succeed({
              run: (receive) =>
                Effect.callback<never>(() => {
                  onBytes = receive
                  return Effect.sync(() => {
                    onBytes = undefined
                  })
                }),
              close: Effect.void,
              write: (bytes) =>
                Effect.sync(() => {
                  const response = Buffer.from(
                    requests.push(wireBytes(bytes)).map(() => `:${++counter}\r\n`).join("")
                  )
                  const receive = onBytes!
                  if (microtaskReplies) queueMicrotask(() => receive(response))
                  else receive(response)
                })
            }),
          { host: "unused", port: 6379 }
        )
        const submit = ConnectionInternal.get(connection)
        assert.isDefined(submit)
        if (submit === undefined) return assert.fail("Expected concrete command submission")
        // Submit from the reply callback so caller-side scheduling cannot hide
        // a transport that monopolizes the event loop.
        const receive = (result: Protocol.Reply | RedisError): void => {
          if (result._tag === "RedisError") {
            Deferred.doneUnsafe(completed, Effect.fail(result))
            return
          }
          values.push(Protocol.toValue(result) as number)
          if (values.length < 512) submit(["INCR", "counter"], receive)
          else Deferred.doneUnsafe(completed, Effect.succeed(values))
        }
        const observing = yield* Effect.callback<number>((resume) => {
          const handle = setImmediate(() => resume(Effect.succeed(values.length)))
          submit(["INCR", "counter"], receive)
          return Effect.sync(() => clearImmediate(handle))
        }).pipe(Effect.forkChild)
        const progressedAt = yield* Fiber.join(observing)
        assert.isAbove(progressedAt, 0)
        assert.isBelow(progressedAt, 512)
        assert.deepStrictEqual(
          yield* Deferred.await(completed),
          Array.from({ length: 512 }, (_, index) => index + 1)
        )
        yield* connection.close
      }
    }))

  it.effect("keeps later command results unchanged after mutation of earlier acknowledgements", () =>
    Effect.gen(function*() {
      const replies = yield* Queue.unbounded<Uint8Array, RedisError>()
      const connection = yield* Connection.make(
        () =>
          Effect.succeed({
            run: (onBytes) => Effect.forever(Queue.take(replies).pipe(Effect.map(onBytes))),
            close: Effect.void,
            write: () =>
              Effect.sync(() => {
                Queue.offerUnsafe(replies, Buffer.from("+OK\r\n+QUEUED\r\n+PONG\r\n|1\r\n+ttl\r\n:10\r\n+PONG\r\n"))
              })
          }),
        { host: "unused", port: 6379 }
      )
      const pipeline = connection.pipeline(Array.from({ length: 4 }, () => ({ arguments: ["PING"] })))
      const first = yield* pipeline
      for (const result of first) {
        assert.strictEqual(result._tag, "Success")
        if (result._tag !== "Success") continue
        const reply = result.success
        if (reply._tag === "Attribute") Reflect.set(reply.entries, "length", 0)
        Reflect.set(reply, "value", "changed")
        Reflect.set(result, "success", { _tag: "SimpleString", value: "changed" })
      }
      const later = yield* pipeline
      const values = later.map((result) => {
        assert.strictEqual(result._tag, "Success")
        return result._tag === "Success" ? Protocol.toValue(result.success) : undefined
      })
      assert.deepStrictEqual(values, ["OK", "QUEUED", "PONG", "PONG"])
      const attributed = later[3]
      assert.strictEqual(attributed._tag, "Success")
      if (attributed._tag === "Success") {
        assert.deepStrictEqual(attributed.success, {
          _tag: "Attribute",
          entries: [[{ _tag: "SimpleString", value: "ttl" }, { _tag: "Integer", value: 10n }]],
          value: { _tag: "SimpleString", value: "PONG" }
        })
      }
    }))

  it.effect("keeps individual pipeline deadlines when earlier replies complete", () =>
    Effect.gen(function*() {
      const written = yield* Deferred.make<void>()
      const received = yield* Deferred.make<void>()
      const replies = yield* Queue.unbounded<Uint8Array, RedisError>()
      const connection = yield* Connection.make(
        () =>
          Effect.succeed({
            run: (onBytes) => Effect.forever(Queue.take(replies).pipe(Effect.map(onBytes))),
            close: Effect.void,
            write: () =>
              Effect.sync(() => {
                Queue.offerUnsafe(replies, Buffer.from("+FIRST\r\n>1\r\n+barrier\r\n"))
                Deferred.doneUnsafe(written, Effect.void)
              })
          }),
        { host: "unused", port: 6379 },
        { commandTimeout: "1 second" }
      )
      assert.isUndefined(ConnectionInternal.get(connection))
      connection.onPush(() => {
        Deferred.doneUnsafe(received, Effect.void)
      })
      const pending = yield* connection.pipeline([
        { arguments: ["PING", "first"] },
        { arguments: ["PING", "second"] }
      ]).pipe(Effect.forkChild)
      yield* Deferred.await(written)
      yield* Deferred.await(received)
      yield* TestClock.adjust("1 second")
      const results = yield* Fiber.join(pending)
      assert.strictEqual(results[0]._tag, "Success")
      const error = failure(results[1])
      assert.strictEqual(error.reason, "Timeout")
      assert.strictEqual(error.outcome, "Unknown")
    }))

  it.live("retains interrupted pipeline entries until their replies drain", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture, { maxPendingCommands: 2 })
      const drained = yield* Deferred.make<void>()
      connection.onPush(() => {
        Deferred.doneUnsafe(drained, Effect.void)
      })
      const pending = yield* connection.pipeline([
        { arguments: ["INCR", "first"] },
        { arguments: ["INCR", "second"] }
      ]).pipe(Effect.forkChild)
      const first = yield* Effect.promise(fixture.nextRequest)
      yield* Effect.promise(fixture.nextRequest)
      yield* Fiber.interrupt(pending)
      assert.strictEqual(failure(yield* Effect.result(connection.execute(["PING"]))).reason, "Capacity")
      first.connection.send(":1\r\n:1\r\n>1\r\n+barrier\r\n")
      yield* Deferred.await(drained)
      const next = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send("+PONG\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(next)), "PONG")
    }))

  it.live("coalesces a pipeline before receiving replies and preserves reply positions", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const writes: Array<Uint8Array> = []
      const base = makeConnector()
      const connector: Connection.Connector = (endpoint) =>
        base(endpoint).pipe(Effect.map((transport) => ({
          ...transport,
          write: (bytes) =>
            Effect.sync(() => {
              writes.push(wireBytes(bytes).slice())
            }).pipe(Effect.andThen(transport.write(bytes)))
        })))
      const connection = yield* Connection.make(connector, fixture)
      const pending = yield* connection.pipeline([
        { arguments: ["SET", "key", "value"] },
        { arguments: ["LPUSH", "key", "wrong-type"] },
        { arguments: ["GET", "key"] }
      ]).pipe(Effect.forkChild)
      const requests = yield* Effect.forEach([0, 1, 2], () => Effect.promise(fixture.nextRequest))
      assert.deepStrictEqual(requests.map((request) => request.args[0].toString()), ["SET", "LPUSH", "GET"])
      assert.strictEqual(writes.length, 1)
      requests[0].connection.send(Buffer.concat([Buffer.from("+OK\r\n-WRONGTYPE invalid value\r\n"), bulk("value")]))
      const results = yield* Fiber.join(pending)
      assert.strictEqual(results[0]._tag, "Success")
      assert.strictEqual(failure(results[1]).code, "WRONGTYPE")
      assert.strictEqual(results[2]._tag, "Success")
      if (results[2]._tag === "Success") assert.strictEqual(Protocol.toValue(results[2].success), "value")
    }))

  it.effect("snapshots queued pipeline binary arguments and encodes Unicode in a single write", () =>
    Effect.gen(function*() {
      const replies = yield* Queue.unbounded<Uint8Array, RedisError>()
      const written = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const requests: Array<Protocol.Reply> = []
      const parser = Protocol.makeParser()
      let writes = 0
      const connection = yield* Connection.make(
        () =>
          Effect.succeed({
            run: (onBytes) => Effect.forever(Queue.take(replies).pipe(Effect.map(onBytes))),
            close: Effect.void,
            write: (bytes) =>
              Effect.gen(function*() {
                const decoded = parser.push(wireBytes(bytes))
                requests.push(...decoded)
                writes++
                Queue.offerUnsafe(replies, Buffer.from(decoded.map(() => "+OK\r\n").join("")))
                if (writes === 1) {
                  Deferred.doneUnsafe(written, Effect.void)
                  yield* Deferred.await(release)
                }
              })
          }),
        { host: "unused", port: 6379 }
      )
      yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      yield* Deferred.await(written)
      const bytes = new Uint8Array([0, 128, 255])
      const other = new Uint8Array([255, 127, 0])
      const shared = new Uint8Array(4096).fill(2)
      const distinct = new Uint8Array(4096).fill(3)
      const operation = connection.pipeline([
        { arguments: ["SET", "binary", bytes] },
        { arguments: ["ECHO", "🥹\uD800"] },
        { arguments: ["MSET", "🥹\uD800", bytes, "µ", other] },
        { arguments: ["MSET", "🥹\uD800", other, "µ", bytes] },
        { arguments: ["MSET", "unique", new Uint8Array([2])] },
        { arguments: ["MSET", "shared", shared, "distinct", distinct] },
        { arguments: ["MSET", "shared", shared, "distinct", shared] }
      ])
      const pipeline = yield* operation.pipe(Effect.forkChild)
      const text = yield* connection.execute(["ECHO", "🥹\uD800"]).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      bytes.fill(99)
      other.fill(98)
      shared.fill(97)
      distinct.fill(96)
      yield* Deferred.succeed(release, undefined)
      const results = yield* Fiber.join(pipeline)
      yield* Fiber.join(text)
      assert.strictEqual(writes, 2)
      assert.isTrue(results.every((result) => result._tag === "Success"))
      const set = requests[1]
      assert.strictEqual(set._tag, "Array")
      if (set._tag === "Array") {
        assert.deepStrictEqual(set.values[2], { _tag: "BlobString", value: new Uint8Array([0, 128, 255]) })
      }
      assert.deepStrictEqual(Protocol.toValue(requests[2]), ["ECHO", "🥹�"])
      for (
        const [index, first, second] of [[3, [0, 128, 255], [255, 127, 0]], [4, [255, 127, 0], [0, 128, 255]]] as const
      ) {
        const command = requests[index]
        assert.strictEqual(command._tag, "Array")
        if (command._tag === "Array") {
          assert.deepStrictEqual(command.values[2], { _tag: "BlobString", value: new Uint8Array(first) })
          assert.deepStrictEqual(command.values[4], { _tag: "BlobString", value: new Uint8Array(second) })
          assert.strictEqual(Protocol.toValue(command.values[1]), "🥹�")
          assert.strictEqual(Protocol.toValue(command.values[3]), "µ")
        }
      }
      assert.deepStrictEqual(Protocol.toValue(requests[5]), ["MSET", "unique", "\u0002"])
      for (const [index, second] of [[6, 3], [7, 2]] as const) {
        const command = requests[index]
        assert.strictEqual(command._tag, "Array")
        if (command._tag === "Array") {
          assert.deepStrictEqual(command.values[2], { _tag: "BlobString", value: new Uint8Array(4096).fill(2) })
          assert.deepStrictEqual(command.values[4], { _tag: "BlobString", value: new Uint8Array(4096).fill(second) })
        }
      }
      assert.deepStrictEqual(Protocol.toValue(requests[8]), ["ECHO", "🥹�"])
      assert.isTrue((yield* operation).every((result) => result._tag === "Success"))
      assert.strictEqual(writes, 3)
      const changed = requests[14]
      assert.strictEqual(changed._tag, "Array")
      if (changed._tag === "Array") {
        assert.deepStrictEqual(changed.values[2], { _tag: "BlobString", value: new Uint8Array(4096).fill(97) })
        assert.deepStrictEqual(changed.values[4], { _tag: "BlobString", value: new Uint8Array(4096).fill(96) })
      }
    }))

  it.effect("preserves binary replies when a custom stream reuses its input buffer", () =>
    Effect.gen(function*() {
      const written = yield* Queue.unbounded<void>()
      const stream = new class extends Duplex {
        override _read() {}
        override _write(_bytes: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
          Queue.offerUnsafe(written, undefined)
          callback()
        }
      }()
      const connection = yield* Connection.make(makeConnector({ stream: () => stream }), { host: "unused", port: 6379 })
      const pending = yield* connection.pipeline([
        { arguments: ["GET", "first"] },
        { arguments: ["GET", "second"] }
      ]).pipe(Effect.forkChild)
      yield* Queue.take(written)
      const producer = Buffer.concat([bulk(new Uint8Array([0, 128, 255])), bulk(new Uint8Array([1, 129, 254]))])
      stream.emit("data", producer)
      producer.fill(99)
      const replies = (yield* Fiber.join(pending)).map((result) => {
        assert.strictEqual(result._tag, "Success")
        if (result._tag !== "Success") return assert.fail("Expected binary reply")
        assert.strictEqual(result.success._tag, "BlobString")
        if (result.success._tag !== "BlobString") return assert.fail("Expected binary reply")
        return result.success.value
      })
      assert.deepStrictEqual(replies[0], new Uint8Array([0, 128, 255]))
      assert.deepStrictEqual(replies[1], new Uint8Array([1, 129, 254]))
      replies[0][0] = 42
      assert.deepStrictEqual(replies[1], new Uint8Array([1, 129, 254]))
      const next = yield* connection.execute(["GET", "third"]).pipe(Effect.forkChild)
      yield* Queue.take(written)
      const later = bulk(new Uint8Array([2, 130, 253]))
      stream.emit("data", later)
      later.fill(99)
      assert.deepStrictEqual(yield* Fiber.join(next), { _tag: "BlobString", value: new Uint8Array([2, 130, 253]) })
      assert.deepStrictEqual(replies[0], new Uint8Array([42, 128, 255]))
      assert.deepStrictEqual(replies[1], new Uint8Array([1, 129, 254]))
    }))

  it.live("rejects an invalid batch before writing any of its commands", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      let writes = 0
      const base = makeConnector()
      const connection = yield* Connection.make(
        (endpoint) =>
          base(endpoint).pipe(Effect.map((transport) => ({
            ...transport,
            write: (bytes) =>
              Effect.sync(() => {
                writes++
              }).pipe(Effect.andThen(transport.write(bytes)))
          }))),
        fixture,
        { maxQueuedBytes: 64 }
      )
      for (
        const commands of [
          [{ arguments: ["SET", "key", "value"] }, { arguments: [] }],
          [{ arguments: ["SET", "key", "value".repeat(50)] }],
          [{ arguments: ["ECHO", "🥹".repeat(20)] }]
        ]
      ) {
        const error = failure(yield* Effect.result(connection.pipeline(commands)))
        assert.strictEqual(error.outcome, "NotSent")
      }
      assert.strictEqual(writes, 0)
      const pending = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send("+PONG\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(pending)), "PONG")
    }))

  it.effect("rejects invalid parser limits through the typed channel before dialing", () =>
    Effect.gen(function*() {
      let opens = 0
      const connector: Connection.Connector = () =>
        Effect.sync(() => {
          opens++
        }).pipe(Effect.andThen(Effect.die("Unexpected connection")))
      for (const config of [{ maxFrameSize: 0 }, { maxDepth: 0 }, { maxAggregateLength: -1 }]) {
        const error = failure(yield* Effect.result(Connection.make(connector, { host: "unused", port: 6379 }, config)))
        assert.strictEqual(error.reason, "Protocol")
        assert.strictEqual(error.outcome, "NotSent")
      }
      assert.strictEqual(opens, 0)
    }))

  it.effect("rejects invalid command timeouts before dialing", () =>
    Effect.gen(function*() {
      let opens = 0
      const connector: Connection.Connector = () =>
        Effect.sync(() => {
          opens++
        }).pipe(Effect.andThen(Effect.die("Unexpected connection")))
      for (const commandTimeout of [NaN, [NaN, 0], { milliseconds: NaN }, -1, "-1 seconds"] as const) {
        const error = failure(
          yield* Effect.result(Connection.make(connector, { host: "unused", port: 6379 }, { commandTimeout }))
        )
        assert.strictEqual(error.reason, "Timeout")
        assert.strictEqual(error.outcome, "NotSent")
      }
      assert.strictEqual(opens, 0)
    }))

  it.live("releases a rejected authentication before the caller's scope closes", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const acquiring = yield* Connection.make(makeConnector(), fixture, { password: "secret" }).pipe(
        Scope.provide(scope),
        Effect.result,
        Effect.forkChild
      )
      const request = yield* Effect.promise(fixture.nextRequest)
      const closed = new Promise<void>((resolve) => request.connection.socket.once("close", () => resolve()))
      request.connection.send("-WRONGPASS invalid username-password pair\r\n")
      assert.strictEqual(failure(yield* Fiber.join(acquiring)).code, "WRONGPASS")
      yield* Effect.promise(() => closed).pipe(Effect.timeout("1 second"))
      assert.isTrue(request.connection.socket.destroyed)
    }))

  it.live("reports a truncated frame at EOF as a protocol failure", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pending = yield* connection.execute(["GET", "key"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.socket.end("$5\r\nab")
      const error = failure(yield* Fiber.join(pending))
      assert.strictEqual(error.reason, "Protocol")
      assert.strictEqual(error.outcome, "Unknown")
    }))

  it.live("routes RESP3 ordinary arrays beginning with Pub/Sub words as command replies", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const acquiring = yield* Connection.make(makeConnector(), fixture, { protocol: 3 }).pipe(Effect.forkChild)
      const hello = yield* Effect.promise(fixture.nextRequest)
      hello.connection.send("%1\r\n+proto\r\n:3\r\n")
      const connection = yield* Fiber.join(acquiring)
      const subscribing = yield* connection.execute(["SUBSCRIBE", "channel"]).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send(">3\r\n+subscribe\r\n+channel\r\n:1\r\n")
      yield* Fiber.join(subscribing)
      for (const first of ["message", "subscribe"]) {
        const pending = yield* connection.execute(["EVAL", "return {'" + first + "','channel','payload'}", "0"]).pipe(
          Effect.forkChild
        )
        const command = yield* Effect.promise(fixture.nextRequest)
        command.connection.send(array(first, "channel", "payload"))
        assert.deepStrictEqual(Protocol.toValue(yield* Fiber.join(pending)), [first, "channel", "payload"])
      }
    }))

  it.effect("keeps timeout transmission outcomes independent when the same effect runs concurrently", () =>
    Effect.gen(function*() {
      const written = yield* Deferred.make<void>()
      const writes: Array<Buffer> = []
      const stream = new class extends Duplex {
        constructor() {
          super({ writableHighWaterMark: 1 })
        }
        override _read() {}
        override _write(bytes: Buffer, _encoding: BufferEncoding, _callback: (error?: Error | null) => void) {
          writes.push(bytes)
          Deferred.doneUnsafe(written, Effect.void)
        }
      }()
      const connection = yield* Connection.make(
        makeConnector({ stream: () => stream }),
        { host: "unused", port: 6379 },
        { commandTimeout: "1 second" }
      )
      const operation = connection.execute(["INCR", "counter"])
      const submitted = yield* operation.pipe(Effect.result, Effect.forkChild)
      yield* Deferred.await(written)
      assert.strictEqual(writes.length, 1)
      const queued = yield* operation.pipe(Effect.result, Effect.forkChild)
      yield* TestClock.adjust("1 second")
      assert.strictEqual(failure(yield* Fiber.join(submitted)).outcome, "Unknown")
      assert.strictEqual(failure(yield* Fiber.join(queued)).outcome, "NotSent")
    }))

  it.live("updates protocol and subscription state when repeated command arguments change", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const args: Array<Protocol.Argument> = []
      const operation = connection.execute(args)
      for (
        const [current, response] of [
          [["HELLO", "3"], "%1\r\n+proto\r\n:3\r\n"],
          [["HELLO", "2"], "*2\r\n+proto\r\n:2\r\n"],
          [["SUBSCRIBE", "channel"], "*3\r\n+subscribe\r\n+channel\r\n:1\r\n"],
          [["SUBSCRIBE", "channel"], "*3\r\n+subscribe\r\n+channel\r\n:1\r\n"],
          [["SUBSCRIBE", "other"], "*3\r\n+subscribe\r\n+other\r\n:2\r\n"],
          [["SSUBSCRIBE", "shard"], "*3\r\n+ssubscribe\r\n+shard\r\n:1\r\n"],
          [["PING"], Buffer.concat([array("message", "other", "payload"), array("pong", "")])],
          [["RESET"], "+RESET\r\n"],
          [["HELLO", "3"], "%1\r\n+proto\r\n:3\r\n"],
          [["SUBSCRIBE", "third"], ">3\r\n+subscribe\r\n+third\r\n:1\r\n"],
          [["RESET"], "+RESET\r\n"]
        ] as const
      ) {
        args.length = 0
        for (const argument of current) args.push(argument)
        const pending = yield* operation.pipe(Effect.forkChild)
        const request = yield* Effect.promise(fixture.nextRequest)
        assert.deepStrictEqual(request.args.map((argument) => argument.toString()), Array.from(current))
        request.connection.send(response)
        const reply = yield* Fiber.join(pending)
        if (current[0] === "PING") assert.deepStrictEqual(Protocol.toValue(reply), ["pong", ""])
      }
      args.splice(0, args.length, "EVAL", "return {'message','channel','payload'}", "0")
      const pending = yield* operation.pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send(array("message", "channel", "payload"))
      assert.deepStrictEqual(Protocol.toValue(yield* Fiber.join(pending)), ["message", "channel", "payload"])
    }))

  it.live("finishes authentication, protocol selection, and database initialization before returning", () =>
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
        const request = yield* Effect.promise(fixture.nextRequest)
        assert.deepStrictEqual(request.args.map((arg) => arg.toString()), [...args])
        request.connection.send(response)
      }
      assert.isTrue((yield* Fiber.join(acquiring)).isOpen())
    }))

  it.live("preserves server error codes without retiring a healthy connection", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pending = yield* connection.execute(["GET", "key"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send("-WRONGTYPE Operation against a key holding the wrong kind of value\r\n")
      const error = failure(yield* Fiber.join(pending))
      assert.strictEqual(error.reason, "Server")
      assert.strictEqual(error.code, "WRONGTYPE")
      assert.isTrue(connection.isOpen())
      const next = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      const ping = yield* Effect.promise(fixture.nextRequest)
      ping.connection.send("+PONG\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(next)), "PONG")
    }))

  it.live("fails malformed replies and settles all transmitted commands as uncertain", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const first = yield* connection.execute(["PING"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      const second = yield* connection.execute(["GET", "key"]).pipe(Effect.result, Effect.forkChild)
      yield* Effect.promise(fixture.nextRequest)
      request.connection.send(":invalid\r\n")
      for (const fiber of [first, second]) {
        const error = failure(yield* Fiber.join(fiber))
        assert.strictEqual(error.reason, "Protocol")
        assert.strictEqual(error.outcome, "Unknown")
      }
      assert.isFalse(connection.isOpen())
    }))

  it.live("retains RESP3 attributes on command replies", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pending = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send("|1\r\n+ttl\r\n:10\r\n+PONG\r\n")
      assert.deepStrictEqual(yield* Fiber.join(pending), {
        _tag: "Attribute",
        entries: [[{ _tag: "SimpleString", value: "ttl" }, { _tag: "Integer", value: 10n }]],
        value: { _tag: "SimpleString", value: "PONG" }
      })
    }))

  it.live("consumes an interrupted transmitted command's reply before the next reply", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const first = yield* connection.execute(["INCR", "counter"]).pipe(Effect.forkChild)
      const submitted = yield* Effect.promise(fixture.nextRequest)
      assert.strictEqual(submitted.args[0].toString(), "INCR")
      yield* Fiber.interrupt(first)
      const second = yield* connection.execute(["GET", "counter"]).pipe(Effect.forkChild)
      yield* Effect.promise(fixture.nextRequest)
      submitted.connection.send(":1\r\n$1\r\n1\r\n")
      const result = yield* Fiber.join(second)
      assert.strictEqual(Protocol.toValue(result), "1")
      assert.isTrue(connection.isOpen())
    }))

  it.live("preserves FIFO replies across concurrent commands", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const fibers = yield* Effect.forEach(Array.from({ length: 64 }, (_, index) => index), (index) =>
        connection.execute(["ECHO", String(index)]).pipe(Effect.forkChild))
      for (let index = 0; index < fibers.length; index++) {
        const request = yield* Effect.promise(fixture.nextRequest)
        request.connection.send(bulk(request.args[1]))
      }
      const replies = yield* Effect.forEach(fibers, Fiber.join)
      assert.deepStrictEqual(
        replies.map(Protocol.toValue),
        Array.from({ length: 64 }, (_, index) =>
          String(index))
      )
    }))

  it.live("routes unsolicited RESP3 pushes without consuming command replies", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const pushes: Array<Protocol.Reply> = []
      const remove = connection.onPush((reply) => pushes.push(reply))
      const pending = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      request.connection.send(">2\r\n+invalidate\r\n*1\r\n$3\r\nkey\r\n+PONG\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(pending)), "PONG")
      assert.strictEqual(pushes.length, 1)
      assert.strictEqual(pushes[0]._tag, "Push")
      remove()
    }))

  it.live("acknowledges RESP2 subscription mode and separates messages from replies", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const messages: Array<unknown> = []
      connection.onPush((reply) => messages.push(Protocol.toValue(reply)))
      const subscription = yield* connection.execute(["SUBSCRIBE", "channel"]).pipe(Effect.forkChild)
      const subscribing = yield* Effect.promise(fixture.nextRequest)
      subscribing.connection.send("*3\r\n$9\r\nsubscribe\r\n$7\r\nchannel\r\n:1\r\n")
      yield* Fiber.join(subscription)
      const ping = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      yield* Effect.promise(fixture.nextRequest)
      subscribing.connection.send(Buffer.concat([array("message", "channel", "payload"), array("pong", "")]))
      assert.deepStrictEqual(Protocol.toValue(yield* Fiber.join(ping)), ["pong", ""])
      assert.deepStrictEqual(messages, [["subscribe", "channel", 1], ["message", "channel", "payload"]])
    }))

  it.live("preserves reply ownership when one RESP2 subscription family becomes empty", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      for (const removed of ["UNSUBSCRIBE", "SUNSUBSCRIBE"]) {
        const connection = yield* Connection.make(makeConnector(), fixture)
        const messages: Array<unknown> = []
        const kind = removed === "UNSUBSCRIBE" ? "smessage" : "message"
        connection.onPush((reply) => {
          const value = Protocol.toValue(reply)
          if (Array.isArray(value) && value[0] === kind) messages.push(value)
        })
        for (const command of ["SUBSCRIBE", "SSUBSCRIBE", removed]) {
          const subscribing = yield* connection.execute([command, "channel"]).pipe(Effect.forkChild)
          const request = yield* Effect.promise(fixture.nextRequest)
          const count = command === removed ? 0 : 1
          request.connection.send(`*3\r\n+${command.toLowerCase()}\r\n+channel\r\n:${count}\r\n`)
          yield* Fiber.join(subscribing)
        }
        const ping = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
        const request = yield* Effect.promise(fixture.nextRequest)
        request.connection.send(Buffer.concat([array(kind, "channel", "payload"), array("pong", "")]))
        assert.deepStrictEqual(Protocol.toValue(yield* Fiber.join(ping)), ["pong", ""])
        assert.deepStrictEqual(messages, [[kind, "channel", "payload"]])
        yield* connection.close
      }
    }))

  it.live("matches subscription acknowledgements to their binary channel before settling commands", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      // Both names decode to the same UTF-8 replacement character.
      const first = new Uint8Array([255])
      const second = new Uint8Array([254])
      const acknowledgement = (marker: string, kind: string, channel: Uint8Array, count: number) =>
        Buffer.concat([Buffer.from(`${marker}3\r\n+${kind}\r\n`), bulk(channel), Buffer.from(`:${count}\r\n`)])
      for (const protocol of [2, 3] as const) {
        const acquiring = yield* Connection.make(makeConnector(), fixture, { protocol }).pipe(Effect.forkChild)
        if (protocol === 3) {
          const hello = yield* Effect.promise(fixture.nextRequest)
          hello.connection.send("%1\r\n+proto\r\n:3\r\n")
        }
        const connection = yield* Fiber.join(acquiring)
        const marker = protocol === 2 ? "*" : ">"
        const subscribed = yield* connection.execute(["SSUBSCRIBE", first]).pipe(Effect.forkChild)
        const subscribe = yield* Effect.promise(fixture.nextRequest)
        subscribe.connection.send(acknowledgement(marker, "ssubscribe", first, 2))
        yield* Fiber.join(subscribed)
        const observed = yield* Deferred.make<void>()
        connection.onPush((reply) => {
          if (
            reply._tag === "Push" && reply.values[0]?._tag === "SimpleString" && reply.values[0].value === "barrier"
          ) {
            Deferred.doneUnsafe(observed, Effect.void)
          }
        })
        const unsubscribed = yield* connection.execute(["SUNSUBSCRIBE", first]).pipe(Effect.forkChild)
        const unsubscribe = yield* Effect.promise(fixture.nextRequest)
        unsubscribe.connection.send(Buffer.concat([
          acknowledgement(marker, "sunsubscribe", second, 1),
          Buffer.from(">1\r\n+barrier\r\n")
        ]))
        yield* Deferred.await(observed)
        yield* Effect.yieldNow
        assert.isUndefined(unsubscribed.pollUnsafe())
        unsubscribe.connection.send(acknowledgement(marker, "sunsubscribe", first, 0))
        const reply = yield* Fiber.join(unsubscribed)
        assert.deepStrictEqual(reply._tag === "Array" || reply._tag === "Push" ? reply.values[1] : undefined, {
          _tag: "BlobString",
          value: first
        })
        yield* connection.close
      }
    }))

  it.live("fails malformed subscription acknowledgements before changing connection mode", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      for (
        const wire of [
          "*3\r\n+subscribe\r\n+channel\r\n:-1\r\n",
          "*3\r\n+subscribe\r\n+channel\r\n+one\r\n",
          "*2\r\n+subscribe\r\n+channel\r\n",
          ">3\r\n+subscribe\r\n_\r\n:1\r\n"
        ]
      ) {
        const connection = yield* Connection.make(makeConnector(), fixture)
        const pending = yield* connection.execute(["SUBSCRIBE", "channel"]).pipe(Effect.result, Effect.forkChild)
        const request = yield* Effect.promise(fixture.nextRequest)
        request.connection.send(wire)
        const error = failure(yield* Fiber.join(pending))
        assert.strictEqual(error.reason, "Protocol")
        assert.strictEqual(error.outcome, "Unknown")
        assert.isFalse(connection.isOpen())
      }
    }))

  it.live("keeps interrupted transmitted work in capacity accounting until its reply arrives", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture, { maxPendingCommands: 1 })
      const first = yield* connection.execute(["INCR", "counter"]).pipe(Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      yield* Fiber.interrupt(first)
      const rejected = failure(yield* Effect.result(connection.execute(["GET", "counter"])))
      assert.strictEqual(rejected.reason, "Capacity")
      assert.strictEqual(rejected.outcome, "NotSent")
      const received = yield* Deferred.make<void>()
      connection.onPush(() => {
        Deferred.doneUnsafe(received, Effect.void)
      })
      request.connection.send(":1\r\n>1\r\n+barrier\r\n")
      yield* Deferred.await(received)
      const retry = yield* connection.execute(["PING"]).pipe(Effect.forkChild)
      const next = yield* Effect.promise(fixture.nextRequest)
      next.connection.send("+PONG\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(retry)), "PONG")
    }))

  it.live("reports a lost post-execution reply as uncertain and refuses further submission", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture)
      const mutation = yield* connection.execute(["INCR", "counter"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      let counter = 0
      counter++
      request.connection.disconnect()
      const error = failure(yield* Fiber.join(mutation))
      assert.strictEqual(error.outcome, "Unknown")
      assert.isFalse(connection.isOpen())
      const rejected = failure(yield* Effect.result(connection.execute(["INCR", "counter"])))
      assert.strictEqual(rejected.outcome, "NotSent")
      assert.strictEqual(counter, 1)
      assert.strictEqual(fixture.connections.length, 1)
    }))

  it.effect("preserves reply ordering after a transmitted command times out", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const connection = yield* Connection.make(makeConnector(), fixture, { commandTimeout: "1 second" })
      const first = yield* connection.execute(["INCR", "counter"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
      yield* TestClock.adjust("1 second")
      assert.strictEqual(failure(yield* Fiber.join(first)).outcome, "Unknown")
      const second = yield* connection.execute(["GET", "counter"]).pipe(Effect.forkChild)
      yield* Effect.promise(fixture.nextRequest)
      request.connection.send(":1\r\n$1\r\n1\r\n")
      assert.strictEqual(Protocol.toValue(yield* Fiber.join(second)), "1")
    }))

  it.live("closes sockets and pending commands before fixture cleanup", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const scope = yield* Scope.make()
      const connection = yield* Connection.make(makeConnector(), fixture).pipe(Scope.provide(scope))
      const pending = yield* connection.execute(["BLPOP", "queue", "0"]).pipe(Effect.result, Effect.forkChild)
      const request = yield* Effect.promise(fixture.nextRequest)
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
