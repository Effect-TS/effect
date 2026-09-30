import { makeConnector } from "@effect/platform-node/internal/redisTransport"
import * as NodeRedis from "@effect/platform-node/NodeRedis"
import type { RedisError } from "@effect/redis/RedisError"
import { startScriptedRedis } from "@effect/redis/test/utils/redis-scripted"
import { assert, describe, it } from "@effect/vitest"
import { Context, Deferred, Effect, Exit, Fiber, Layer, Redacted, Scope } from "effect"
import type * as Duration from "effect/Duration"
import * as Redis from "effect/persistence/Redis"
import type * as Result from "effect/Result"
import * as Fs from "node:fs"
import * as Net from "node:net"
import * as Os from "node:os"
import * as Path from "node:path"
import { Duplex } from "node:stream"
import * as Tls from "node:tls"

const server = Effect.acquireRelease(
  Effect.promise(() => startScriptedRedis()),
  (server) => Effect.promise(() => server.stop())
)
const failure = <A>(result: Result.Result<A, RedisError>): RedisError => {
  assert.strictEqual(result._tag, "Failure")
  if (result._tag !== "Failure") return assert.fail("Expected Redis failure")
  return result.failure
}

describe("NodeRedis configuration", () => {
  it.live("scans every page and reports malformed replies as persistence errors", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const acquiring = yield* Layer.build(NodeRedis.layer({ socket: fixture })).pipe(Effect.forkChild)
      const ping = yield* Effect.promise(fixture.nextRequest)
      ping.connection.send("+PONG\r\n")
      const redis = Context.get(yield* Fiber.join(acquiring), Redis.Redis)
      const scanning = yield* redis.scan("prefix:*").pipe(Effect.forkChild)
      const first = yield* Effect.promise(fixture.nextRequest)
      assert.deepStrictEqual(first.args.map((arg) => arg.toString()), [
        "SCAN",
        "0",
        "MATCH",
        "prefix:*",
        "COUNT",
        "100"
      ])
      first.connection.send("*2\r\n$1\r\n9\r\n*1\r\n$1\r\na\r\n")
      const second = yield* Effect.promise(fixture.nextRequest)
      assert.strictEqual(second.args[1].toString(), "9")
      second.connection.send("*2\r\n$1\r\n0\r\n*2\r\n$1\r\nb\r\n$1\r\na\r\n")
      assert.deepStrictEqual(yield* Fiber.join(scanning), ["a", "b"])

      for (
        const wire of [
          "*2\r\n:0\r\n*0\r\n",
          "*2\r\n$3\r\nbad\r\n*0\r\n",
          "*2\r\n$1\r\n0\r\n*1\r\n:1\r\n"
        ]
      ) {
        const malformed = yield* redis.scan("prefix:*").pipe(Effect.flip, Effect.forkChild)
        const request = yield* Effect.promise(fixture.nextRequest)
        request.connection.send(wire)
        assert.instanceOf(yield* Fiber.join(malformed), Redis.RedisError)
      }
    }))

  it.live("keeps decoded URL credentials redacted in the exposed client configuration", () =>
    Effect.gen(function*() {
      const fixture = yield* server
      const secret = "secret-that-must-stay-redacted"
      const acquiring = yield* NodeRedis.make({
        url: Redacted.make(`redis://user:${secret}@${fixture.host}:${fixture.port}`)
      }).pipe(Effect.forkChild)
      const auth = yield* Effect.promise(fixture.nextRequest)
      assert.deepStrictEqual(auth.args.map((arg) => arg.toString()), ["AUTH", "user", secret])
      auth.connection.send("+OK\r\n")
      const ping = yield* Effect.promise(fixture.nextRequest)
      ping.connection.send("+PONG\r\n")
      const client = yield* Fiber.join(acquiring)
      assert.isTrue(Redacted.isRedacted(client.config.password))
      assert.notInclude(JSON.stringify(client.config), secret)
      assert.isFalse("url" in client.config)
    }))

  it.effect("omits secret URL input from malformed URL diagnostics", () =>
    Effect.gen(function*() {
      const secret = "secret-that-must-stay-redacted"
      for (const url of [`redis://user:${secret}@invalid host`, `redis://user:${secret}%zz@localhost`]) {
        const error = failure(yield* Effect.result(NodeRedis.make({ url: Redacted.make(url) })))
        assert.notInclude(JSON.stringify(error), secret)
      }
    }))
})

const endpoint = { host: "127.0.0.1", port: 0 }
const cert = Fs.readFileSync(new URL("./fixtures/tls/cert.pem", import.meta.url))
const key = Fs.readFileSync(new URL("./fixtures/tls/key.pem", import.meta.url))
const makeServer = (server: Net.Server, path?: string) =>
  Effect.acquireRelease(
    Effect.callback<Net.Server>((resume) => {
      server.once("error", (cause) => resume(Effect.die(cause)))
      const ready = () => resume(Effect.succeed(server))
      if (path === undefined) server.listen(0, "127.0.0.1", ready)
      else server.listen(path, ready)
    }),
    (server) =>
      Effect.callback<void>((resume) => {
        server.close(() => resume(Effect.void))
      })
  )
const address = (server: Net.Server) => ({ ...endpoint, port: (server.address() as Net.AddressInfo).port })
const echo = (socket: Net.Socket) => {
  socket.on("error", () => {})
  socket.pipe(socket)
}

class HeldStream extends Duplex {
  readonly writes: Array<Buffer> = []
  release: (() => void) | undefined
  constructor() {
    super({ writableHighWaterMark: 1 })
  }
  override _read() {}
  override _write(bytes: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.writes.push(bytes)
    this.release = callback
  }
}

describe("Redis transport", () => {
  it.effect("rejects invalid connection timeouts before opening a transport", () =>
    Effect.gen(function*() {
      let opened = 0
      const timeouts: ReadonlyArray<Duration.Input> = [
        NaN,
        -1,
        [NaN, 0],
        { milliseconds: NaN },
        "invalid duration" as Duration.Input
      ]
      for (const connectTimeout of timeouts) {
        const result = yield* Effect.result(
          makeConnector({
            connectTimeout,
            stream: () => {
              opened++
              return new HeldStream()
            }
          })(endpoint)
        )
        assert.strictEqual(result._tag, "Failure")
        if (result._tag === "Failure") {
          assert.strictEqual(result.failure.reason, "Timeout")
          assert.strictEqual(result.failure.outcome, "NotSent")
        }
      }
      assert.strictEqual(opened, 0)
    }))

  it.live("applies a custom TLS lookup to the underlying TCP connection", () =>
    Effect.gen(function*() {
      const server = yield* makeServer(Tls.createServer({ cert, key }, echo))
      let lookedUp: string | undefined
      const lookup: Net.LookupFunction = (hostname, options, callback) => {
        lookedUp = hostname
        if (options.all) callback(null, [{ address: "127.0.0.1", family: 4 }])
        else callback(null, "127.0.0.1", 4)
      }
      const transport = yield* makeConnector()({
        ...address(server),
        host: "redis.invalid",
        tls: {
          ca: cert,
          servername: "localhost",
          lookup
        }
      })
      yield* transport.write(new Uint8Array([1]))
      assert.deepStrictEqual(yield* transport.read, new Uint8Array([1]))
      assert.strictEqual(lookedUp, "redis.invalid")
    }))

  it.live("exchanges binary data over TCP and closes pending reads with its scope", () =>
    Effect.gen(function*() {
      const server = yield* makeServer(Net.createServer(echo))
      const scope = yield* Scope.make()
      const transport = yield* makeConnector()(address(server)).pipe(Scope.provide(scope))
      const bytes = new Uint8Array([0, 13, 10, 255, 128])
      yield* transport.write(bytes)
      assert.deepStrictEqual(yield* transport.read, bytes)
      const pending = yield* transport.read.pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Scope.close(scope, Exit.void)
      assert.isTrue(Exit.isFailure(yield* Fiber.await(pending)))
      assert.isTrue(Exit.isFailure(yield* Effect.exit(transport.write(bytes))))
    }))

  it.live("keeps native socket chunks stable across later reads", () =>
    Effect.gen(function*() {
      const server = yield* makeServer(Net.createServer(echo))
      const transport = yield* makeConnector()(address(server))
      const bytes = new Uint8Array([0, 128, 255])
      yield* transport.write(bytes)
      const first = yield* transport.read
      bytes.fill(99)
      yield* transport.write(bytes)
      assert.deepStrictEqual(yield* transport.read, bytes)
      assert.deepStrictEqual(first, new Uint8Array([0, 128, 255]))
    }))

  it.live("exchanges data over Unix sockets", () =>
    Effect.gen(function*() {
      const directory = yield* Effect.acquireRelease(
        Effect.sync(() => Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-redis-"))),
        (directory) => Effect.sync(() => Fs.rmSync(directory, { recursive: true, force: true }))
      )
      const path = Path.join(directory, "redis.sock")
      yield* makeServer(Net.createServer(echo), path)
      const transport = yield* makeConnector()({ ...endpoint, path })
      yield* transport.write(new TextEncoder().encode("unix"))
      assert.strictEqual(new TextDecoder().decode(yield* transport.read), "unix")
    }))

  it.live("validates TLS certificates and supports a trusted custom CA", () =>
    Effect.gen(function*() {
      const server = yield* makeServer(Tls.createServer({ cert, key }, echo))
      server.on("tlsClientError", () => {})
      const rejected = yield* Effect.exit(makeConnector()({ ...address(server), tls: true }))
      assert.isTrue(Exit.isFailure(rejected))
      const transport = yield* makeConnector()({ ...address(server), tls: { ca: cert } })
      yield* transport.write(new Uint8Array([1, 2, 3]))
      assert.deepStrictEqual(yield* transport.read, new Uint8Array([1, 2, 3]))
      const wrongName = yield* Effect.result(
        makeConnector()({
          ...address(server),
          host: "localhost",
          tls: { ca: cert, servername: "wrong.example" }
        })
      )
      assert.strictEqual(wrongName._tag, "Failure")
      if (wrongName._tag === "Failure") {
        assert.strictEqual((wrongName.failure.cause as NodeJS.ErrnoException).code, "ERR_TLS_CERT_ALTNAME_INVALID")
      }
    }))

  it.live("copies input, submits once under backpressure, and wakes blocked writers on close", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      const bytes = new Uint8Array([1, 2])
      const writing = yield* transport.write(bytes).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      bytes[0] = 99
      assert.deepStrictEqual([...stream.writes[0]!], [1, 2])
      assert.strictEqual(stream.writes.length, 1)
      yield* transport.close
      assert.isTrue(Exit.isFailure(yield* Fiber.await(writing)))
      assert.isTrue(stream.destroyed)
      assert.strictEqual(stream.listenerCount("readable"), 0)
      assert.strictEqual(stream.listenerCount("data"), 0)
      assert.strictEqual(stream.listenerCount("drain"), 0)
      assert.strictEqual(stream.listenerCount("error"), 0)
    }))

  it.live("keeps backpressure after interruption without resubmitting accepted bytes", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      const first = yield* transport.write(new Uint8Array([1])).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Fiber.interrupt(first)
      const second = yield* transport.write(new Uint8Array([2])).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      assert.strictEqual(stream.writes.length, 1)
      stream.release!()
      yield* Effect.yieldNow
      assert.deepStrictEqual(stream.writes.map((bytes) => [...bytes]), [[1], [2]])
      stream.release!()
      yield* Fiber.join(second)
    }))

  it.live("removes interrupted queued writes and preserves FIFO under backpressure", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      const first = yield* transport.write(new Uint8Array([1])).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      const second = yield* transport.write(new Uint8Array([2])).pipe(Effect.forkChild)
      const queued = new Uint8Array([3])
      const third = yield* transport.write(queued).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      queued[0] = 99
      yield* Fiber.interrupt(second)
      assert.strictEqual(stream.writes.length, 1)
      stream.release!()
      yield* Effect.yieldNow
      assert.deepStrictEqual(stream.writes.map((bytes) => [...bytes]), [[1], [3]])
      stream.release!()
      yield* Fiber.join(first)
      yield* Fiber.join(third)
    }))

  it.live("distinguishes submitted and queued write outcomes when closing under backpressure", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      const first = yield* transport.write(new Uint8Array([1])).pipe(Effect.result, Effect.forkChild)
      yield* Effect.yieldNow
      const second = yield* transport.write(new Uint8Array([2])).pipe(Effect.result, Effect.forkChild)
      yield* Effect.yieldNow
      yield* transport.close
      assert.strictEqual(failure(yield* Fiber.join(first)).outcome, "Unknown")
      assert.strictEqual(failure(yield* Fiber.join(second)).outcome, "NotSent")
      assert.deepStrictEqual(stream.writes.map((bytes) => [...bytes]), [[1]])
    }))

  it.live("accepts transferred immutable byte views without copying or altering them", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      const detached = new Uint8Array(1)
      structuredClone(detached.buffer, { transfer: [detached.buffer] })
      const error = failure(yield* Effect.result(transport.write(detached, { ownership: "transfer" })))
      assert.strictEqual(error.outcome, "NotSent")
      assert.strictEqual(stream.writes.length, 0)
      const source = new Uint8Array([9, 1, 2, 9])
      const bytes = source.subarray(1, 3)
      const writing = yield* transport.write(bytes, { ownership: "transfer" }).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      const written = stream.writes[0]!
      assert.deepStrictEqual([...written], [1, 2])
      assert.strictEqual(written.buffer, source.buffer)
      assert.strictEqual(written.byteOffset, bytes.byteOffset)
      stream.release!()
      yield* Fiber.join(writing)
      assert.deepStrictEqual([...source], [9, 1, 2, 9])
    }))

  it.live("copies read buffers and removes interrupted read waiters", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      const cancelled = yield* transport.read.pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Fiber.interrupt(cancelled)
      const bytes = Buffer.from([1, 2])
      stream.push(bytes)
      const received = yield* transport.read
      bytes[0] = 99
      assert.deepStrictEqual([...received], [1, 2])
    }))

  it.live("pauses after buffering an unread chunk and resumes subsequent reads in order", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      const first = yield* transport.read.pipe(Effect.forkChild)
      yield* Effect.yieldNow
      stream.push(Buffer.from([1]))
      assert.deepStrictEqual([...yield* Fiber.join(first)], [1])
      const second = Buffer.from([2])
      stream.push(second)
      yield* Effect.yieldNow
      assert.strictEqual(stream.readableFlowing, false)
      second[0] = 99
      stream.push(Buffer.from([3]))
      assert.deepStrictEqual([...yield* transport.read], [2])
      assert.deepStrictEqual([...yield* transport.read], [3])
    }))

  it.live("delivers buffered data before peer EOF while rejecting further writes", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      // A terminal event can follow the last data event before the consumer has
      // registered another read, even after the stream was paused.
      stream.emit("data", Buffer.from([1, 2]))
      stream.emit("end")
      assert.isTrue(Exit.isFailure(yield* Effect.exit(transport.write(new Uint8Array([3])))))
      assert.deepStrictEqual([...yield* transport.read], [1, 2])
      assert.isTrue(Exit.isFailure(yield* Effect.exit(transport.read)))
    }))

  it.live("discards buffered data on explicit close after peer EOF", () =>
    Effect.gen(function*() {
      const stream = new HeldStream()
      const transport = yield* makeConnector({ stream: () => stream })(endpoint)
      stream.emit("data", Buffer.from([1, 2]))
      stream.emit("end")
      yield* transport.close
      assert.isTrue(Exit.isFailure(yield* Effect.exit(transport.read)))
    }))

  it.live("destroys a socket when interrupted during TLS negotiation", () =>
    Effect.gen(function*() {
      const accepted = yield* Deferred.make<Net.Socket>()
      const server = yield* makeServer(Net.createServer((socket) => {
        socket.on("error", () => {})
        socket.resume()
        Deferred.doneUnsafe(accepted, Exit.succeed(socket))
      }))
      const connecting = yield* makeConnector()({ ...address(server), tls: true }).pipe(Effect.forkChild)
      const peer = yield* Deferred.await(accepted)
      const closed = new Promise<void>((resolve) => peer.once("close", () => resolve()))
      yield* Fiber.interrupt(connecting)
      yield* Effect.promise(() => closed).pipe(Effect.timeout("2 seconds"))
      assert.isTrue(peer.destroyed)
    }))

  it.live("reports connection refusal as unsent", () =>
    Effect.gen(function*() {
      const server = yield* makeServer(Net.createServer())
      const target = address(server)
      yield* Effect.promise(() => new Promise<void>((resolve) => server.close(() => resolve())))
      const result = yield* Effect.result(makeConnector()(target))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure.reason, "Connection")
        assert.strictEqual(result.failure.outcome, "NotSent")
      }
    }))
})
