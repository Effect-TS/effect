import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as NodeRedis from "@effect/platform-node-shared/NodeRedis"
import type { Transport } from "@effect/redis/RedisConnection"
import type { RedisError } from "@effect/redis/RedisError"
import { type ScriptedRedis, startScriptedRedis } from "@effect/redis/test/utils/redis-scripted"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Fiber, Layer, Queue, Redacted, Scope } from "effect"
import * as Redis from "effect/persistence/Redis"
import * as Fs from "node:fs"
import * as Net from "node:net"
import * as Os from "node:os"
import * as Path from "node:path"
import { Duplex } from "node:stream"
import * as Tls from "node:tls"

const scripted = Effect.acquireRelease(
  Effect.promise(() => startScriptedRedis()),
  (server) => Effect.promise(() => server.stop())
)
const reply = (server: ScriptedRedis, wire: string) =>
  Effect.promise(server.nextRequest).pipe(Effect.map((request) => request.connection.send(wire)))

describe("NodeRedis", () => {
  it.live("scans every page", () =>
    Effect.gen(function*() {
      const server = yield* scripted
      const building = yield* Layer.build(NodeRedis.layer({ socket: server })).pipe(Effect.forkChild)
      yield* reply(server, "+PONG\r\n")
      const redis = Context.get(yield* Fiber.join(building), Redis.Redis)

      const scanning = yield* redis.scan("prefix:*").pipe(Effect.forkChild)
      const first = yield* Effect.promise(server.nextRequest)
      assert.deepStrictEqual(first.args.map(String), ["SCAN", "0", "MATCH", "prefix:*", "COUNT", "100"])
      first.connection.send("*2\r\n$1\r\n9\r\n*1\r\n$1\r\na\r\n")
      const second = yield* Effect.promise(server.nextRequest)
      assert.strictEqual(String(second.args[1]), "9")
      second.connection.send("*2\r\n$1\r\n0\r\n*2\r\n$1\r\nb\r\n$1\r\na\r\n")
      assert.deepStrictEqual(yield* Fiber.join(scanning), ["a", "b"])

      const malformed = yield* redis.scan("prefix:*").pipe(Effect.flip, Effect.forkChild)
      yield* reply(server, "*2\r\n$3\r\nbad\r\n*0\r\n")
      assert.instanceOf(yield* Fiber.join(malformed), Redis.RedisError)
    }))

  it.live("authenticates with URL credentials and keeps them redacted", () =>
    Effect.gen(function*() {
      const server = yield* scripted
      const connecting = yield* NodeRedis.make({
        url: Redacted.make(`redis://user:p%40ss@${server.host}:${server.port}`)
      }).pipe(Effect.forkChild)
      const auth = yield* Effect.promise(server.nextRequest)
      assert.deepStrictEqual(auth.args.map(String), ["AUTH", "user", "p@ss"])
      auth.connection.send("+OK\r\n")
      yield* reply(server, "+PONG\r\n")
      const client = yield* Fiber.join(connecting)
      assert.isTrue(Redacted.isRedacted(client.config.password))
      assert.notInclude(JSON.stringify(client.config), "p@ss")

      const invalid = yield* NodeRedis.make({ url: Redacted.make("redis://user:p@ss@invalid host") }).pipe(Effect.flip)
      assert.notInclude(JSON.stringify(invalid), "p@ss")
    }))
})

const endpoint = { host: "127.0.0.1", port: 0 }
const cert = Fs.readFileSync(new URL("../../node/test/fixtures/tls/cert.pem", import.meta.url))
const key = Fs.readFileSync(new URL("../../node/test/fixtures/tls/key.pem", import.meta.url))

const listen = (server: Net.Server, path?: string) =>
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

const collect = Effect.fnUntraced(function*(transport: Transport) {
  const chunks = yield* Queue.unbounded<Uint8Array, RedisError>()
  yield* transport.run((bytes) => Queue.offerUnsafe(chunks, bytes)).pipe(
    Effect.catch((error) => Queue.fail(chunks, error)),
    Effect.ensuring(Queue.shutdown(chunks)),
    Effect.forkScoped
  )
  return { ...transport, read: Queue.take(chunks) }
})

class HeldStream extends Duplex {
  readonly writes: Array<Buffer> = []
  release: ((error?: Error | null) => void) | undefined
  constructor() {
    super({ writableHighWaterMark: 1 })
  }
  override _read() {}
  override _write(bytes: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.writes.push(bytes)
    this.release = callback
  }
}
const held = Effect.fnUntraced(function*() {
  const stream = new HeldStream()
  const transport = yield* makeConnector({ stream: () => stream })(endpoint)
  return { stream, transport }
})
const written = (stream: HeldStream) => stream.writes.map((bytes) => [...bytes])

describe("redisTransport", () => {
  it.live("exchanges bytes over TCP and fails pending reads when its scope closes", () =>
    Effect.gen(function*() {
      const server = yield* listen(Net.createServer(echo))
      const scope = yield* Scope.make()
      const transport = yield* makeConnector()(address(server)).pipe(Effect.flatMap(collect), Scope.provide(scope))
      const bytes = new Uint8Array([0, 13, 10, 255])
      yield* transport.write(bytes)
      assert.deepStrictEqual(yield* transport.read, bytes)

      const pending = yield* transport.read.pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Scope.close(scope, Exit.void)
      assert.isTrue(Exit.isFailure(yield* Fiber.await(pending)))
    }))

  it.live("exchanges bytes over a Unix socket", () =>
    Effect.gen(function*() {
      const directory = yield* Effect.acquireRelease(
        Effect.sync(() => Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-redis-"))),
        (directory) => Effect.sync(() => Fs.rmSync(directory, { recursive: true, force: true }))
      )
      const path = Path.join(directory, "redis.sock")
      yield* listen(Net.createServer(echo), path)
      const transport = yield* makeConnector()({ ...endpoint, path }).pipe(Effect.flatMap(collect))
      yield* transport.write("unix")
      assert.strictEqual(new TextDecoder().decode(yield* transport.read), "unix")
    }))

  it.live("verifies TLS certificates against a custom CA and hostname", () =>
    Effect.gen(function*() {
      const server = yield* listen(Tls.createServer({ cert, key }, echo))
      server.on("tlsClientError", () => {})
      const connect = makeConnector()

      assert.isTrue(Exit.isFailure(yield* Effect.exit(connect({ ...address(server), tls: true }))))
      const wrongName = yield* connect({ ...address(server), tls: { ca: cert, servername: "wrong.example" } }).pipe(
        Effect.flip
      )
      assert.strictEqual((wrongName.cause as NodeJS.ErrnoException).code, "ERR_TLS_CERT_ALTNAME_INVALID")

      const transport = yield* connect({ ...address(server), tls: { ca: cert } }).pipe(Effect.flatMap(collect))
      yield* transport.write(new Uint8Array([1, 2, 3]))
      assert.deepStrictEqual(yield* transport.read, new Uint8Array([1, 2, 3]))
    }))

  it.live("resolves TLS hosts with a custom lookup", () =>
    Effect.gen(function*() {
      const server = yield* listen(Tls.createServer({ cert, key }, echo))
      let resolved: string | undefined
      const lookup: Net.LookupFunction = (hostname, options, callback) => {
        resolved = hostname
        if (options.all) callback(null, [{ address: "127.0.0.1", family: 4 }])
        else callback(null, "127.0.0.1", 4)
      }
      const transport = yield* makeConnector()({
        ...address(server),
        host: "redis.invalid",
        tls: { ca: cert, servername: "localhost", lookup }
      }).pipe(Effect.flatMap(collect))
      yield* transport.write(new Uint8Array([1]))
      assert.deepStrictEqual(yield* transport.read, new Uint8Array([1]))
      assert.strictEqual(resolved, "redis.invalid")
    }))

  it.live("completes a write once the stream drains", () =>
    Effect.gen(function*() {
      const { stream, transport } = yield* held()
      const writing = yield* transport.write(new Uint8Array([1, 2])).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      assert.isUndefined(writing.pollUnsafe())
      stream.release!()
      yield* Fiber.join(writing)
      assert.deepStrictEqual(written(stream), [[1, 2]])
    }))

  it.live("fails the in-flight write as Unknown and queued writes as NotSent on close", () =>
    Effect.gen(function*() {
      const { stream, transport } = yield* held()
      const inFlight = yield* transport.write(new Uint8Array([1])).pipe(Effect.flip, Effect.forkChild)
      yield* Effect.yieldNow
      const queued = yield* transport.write(new Uint8Array([2])).pipe(Effect.flip, Effect.forkChild)
      yield* Effect.yieldNow
      yield* transport.close
      assert.strictEqual((yield* Fiber.join(inFlight)).outcome, "Unknown")
      assert.strictEqual((yield* Fiber.join(queued)).outcome, "NotSent")
      assert.deepStrictEqual(written(stream), [[1]])
      assert.isTrue(stream.destroyed)
    }))

  it.live("does not send an interrupted queued write", () =>
    Effect.gen(function*() {
      const { stream, transport } = yield* held()
      const first = yield* transport.write(new Uint8Array([1])).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      const interrupted = yield* transport.write(new Uint8Array([2])).pipe(Effect.forkChild)
      const third = yield* transport.write(new Uint8Array([3])).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Fiber.interrupt(interrupted)
      stream.release!()
      yield* Fiber.join(first)
      yield* Effect.yieldNow
      stream.release!()
      yield* Fiber.join(third)
      assert.deepStrictEqual(written(stream), [[1], [3]])
    }))

  it.live("reports a synchronous write failure as Unknown and later writes as NotSent", () =>
    Effect.gen(function*() {
      const { stream, transport } = yield* held()
      stream.write = () => {
        throw new Error("Write failed")
      }
      assert.strictEqual((yield* transport.write("first").pipe(Effect.flip)).outcome, "Unknown")
      assert.strictEqual((yield* transport.write("second").pipe(Effect.flip)).outcome, "NotSent")
      assert.isTrue(stream.destroyed)
    }))

  it.live("reports a refused connection as NotSent", () =>
    Effect.gen(function*() {
      const server = yield* listen(Net.createServer())
      const target = address(server)
      yield* Effect.callback<void>((resume) => {
        server.close(() => resume(Effect.void))
      })
      const error = yield* makeConnector()(target).pipe(Effect.flip)
      assert.strictEqual(error.reason, "Connection")
      assert.strictEqual(error.outcome, "NotSent")
    }))

  it.effect("rejects an invalid connect timeout before opening a socket", () =>
    Effect.gen(function*() {
      let opened = 0
      for (const connectTimeout of [-1, NaN]) {
        const error = yield* makeConnector({
          connectTimeout,
          stream: () => {
            opened++
            return new HeldStream()
          }
        })(endpoint).pipe(Effect.flip)
        assert.strictEqual(error.reason, "Timeout")
        assert.strictEqual(error.outcome, "NotSent")
      }
      assert.strictEqual(opened, 0)
    }))
})
