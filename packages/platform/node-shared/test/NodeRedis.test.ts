import { makeConnector } from "@effect/platform-node-shared/internal/redisTransport"
import * as NodeRedis from "@effect/platform-node-shared/NodeRedis"
import type { Transport } from "@effect/redis/RedisConnection"
import type { RedisError } from "@effect/redis/RedisError"
import { startScriptedRedis } from "@effect/redis/test/utils/redis-scripted"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Queue, Redacted } from "effect"
import * as Fs from "node:fs"
import * as Net from "node:net"
import { Duplex } from "node:stream"
import * as Tls from "node:tls"

describe("NodeRedis", () => {
  it.live("authenticates with URL credentials and keeps them redacted", () =>
    Effect.gen(function*() {
      const server = yield* Effect.acquireRelease(
        Effect.promise(() => startScriptedRedis()),
        (server) => Effect.promise(() => server.stop())
      )
      const connecting = yield* NodeRedis.make({
        url: Redacted.make(`redis://user:p%40ss@${server.host}:${server.port}`)
      }).pipe(Effect.forkChild)
      const auth = yield* Effect.promise(server.nextRequest)
      assert.deepStrictEqual(auth.args.map(String), ["AUTH", "user", "p@ss"])
      auth.connection.send("+OK\r\n")
      ;(yield* Effect.promise(server.nextRequest)).connection.send("+PONG\r\n")
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

const listen = (server: Net.Server) =>
  Effect.acquireRelease(
    Effect.callback<Net.Server>((resume) => {
      server.once("error", (cause) => resume(Effect.die(cause)))
      server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
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
      yield* transport.write(new Uint8Array([0, 13, 10, 255]))
      assert.deepStrictEqual(yield* transport.read, new Uint8Array([0, 13, 10, 255]))
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

  it.live("sends queued writes after each drain and drops interrupted ones", () =>
    Effect.gen(function*() {
      const { stream, transport } = yield* held()
      const first = yield* transport.write(new Uint8Array([1])).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      const interrupted = yield* transport.write(new Uint8Array([2])).pipe(Effect.forkChild)
      const third = yield* transport.write(new Uint8Array([3])).pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Fiber.interrupt(interrupted)
      assert.isUndefined(first.pollUnsafe())
      stream.release!()
      yield* Fiber.join(first)
      yield* Effect.yieldNow
      assert.isUndefined(third.pollUnsafe())
      stream.release!()
      yield* Fiber.join(third)
      assert.deepStrictEqual(written(stream), [[1], [3]])
    }))

  it.live("fails the reader, the in-flight write as Unknown and queued writes as NotSent on close", () =>
    Effect.gen(function*() {
      const { stream, transport } = yield* held()
      const reading = yield* transport.run(() => {}).pipe(Effect.flip, Effect.forkChild)
      const inFlight = yield* transport.write(new Uint8Array([1])).pipe(Effect.flip, Effect.forkChild)
      yield* Effect.yieldNow
      const queued = yield* transport.write(new Uint8Array([2])).pipe(Effect.flip, Effect.forkChild)
      yield* Effect.yieldNow
      yield* transport.close
      assert.strictEqual((yield* Fiber.join(reading)).reason, "Closed")
      assert.strictEqual((yield* Fiber.join(inFlight)).outcome, "Unknown")
      assert.strictEqual((yield* Fiber.join(queued)).outcome, "NotSent")
      assert.deepStrictEqual(written(stream), [[1]])
      assert.isTrue(stream.destroyed)
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
