import type * as NodeSocketConnector from "@effect/platform-node-shared/NodeSocketConnector"
import { assert, describe, it } from "@effect/vitest"
import { Context, Deferred, Effect, Exit, Fiber } from "effect"
import * as Fs from "node:fs"
import * as Net from "node:net"
import { Duplex } from "node:stream"
import * as Tls from "node:tls"

const endpoint = { host: "127.0.0.1", port: 0 }
const cert = Fs.readFileSync(new URL("../../../bun/test/fixtures/tls/cert.pem", import.meta.url))
const key = Fs.readFileSync(new URL("../../../bun/test/fixtures/tls/key.pem", import.meta.url))

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
const held = (connector: typeof NodeSocketConnector.make) =>
  Effect.gen(function*() {
    const stream = new HeldStream()
    const transport = yield* connector({ stream: () => stream }).connect(endpoint)
    return { stream, transport }
  })
const written = (stream: HeldStream) => stream.writes.map((bytes) => [...bytes])

export const socketConnectorTests = (name: string, make: typeof NodeSocketConnector.make) =>
  describe(name, () => {
    it.effect("rejects TLS fragment limits on a plaintext connection", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        let invoked = false
        Object.assign(stream, {
          setMaxSendFragment: () => {
            invoked = true
            return true
          }
        })
        assert.isDefined(transport.setTlsMaxSendFragment)
        const error = yield* transport.setTlsMaxSendFragment!(4096).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "SocketUpgradeError")
        assert.isFalse(invoked)
      }))

    it.effect.each([511, 16385, 512.5, NaN, Infinity])("rejects an invalid TLS fragment limit (%s)", (size) =>
      Effect.gen(function*() {
        const { transport } = yield* held(make)
        const error = yield* transport.setTlsMaxSendFragment!(size).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "SocketUpgradeError")
        if (error.reason._tag === "SocketUpgradeError") {
          assert.instanceOf(error.reason.cause, RangeError)
        }
      }))

    it.live.each([false, true])("sets TLS fragment limits on a native connection (upgrade: %s)", (upgrade) =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        const transport = yield* make().connect({ ...address(server), tls: upgrade ? undefined : { ca: cert } })
        if (upgrade) {
          yield* transport.upgrade({ ca: cert, servername: "localhost" })
        }
        assert.isDefined(transport.setTlsMaxSendFragment)
        for (const size of [512, 4096, 16384]) {
          const result = yield* transport.setTlsMaxSendFragment!(size).pipe(Effect.result)
          if (result._tag === "Failure") {
            // Some compatibility runtimes expose a TLS setter that is not implemented.
            assert.notStrictEqual(name, "NodeSocketConnector")
            assert.strictEqual(result.failure.reason._tag, "SocketUpgradeError")
            return
          }
        }
        yield* transport.write("fragment-limit")
        assert.strictEqual(Buffer.from((yield* transport.pull)[0]).toString(), "fragment-limit")
      }))

    it.live.each(["unavailable", "rejected", "throws"])("retains TLS fragment setter failures (%s)", (mode) =>
      Effect.gen(function*() {
        const cause = new Error("Native TLS fragment setter failed")
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        const tls = yield* Effect.acquireRelease(
          Effect.callback<Tls.TLSSocket>((resume) => {
            const socket = Tls.connect({ ...address(server), ca: cert })
            socket.once("secureConnect", () =>
              resume(Effect.succeed(socket)))
            socket.once("error", (cause) =>
              resume(Effect.die(cause)))
            return Effect.sync(() =>
              socket.destroy()
            )
          }),
          (socket) =>
            Effect.sync(() =>
              socket.destroy()
            )
        )
        Object.defineProperty(tls, "setMaxSendFragment", {
          value: mode === "unavailable" ? undefined : () => {
            if (mode === "throws") throw cause
            return false
          }
        })
        const transport = yield* make({ stream: () => tls }).connect(endpoint)
        const error = yield* transport.setTlsMaxSendFragment!(4096).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "SocketUpgradeError")
        if (mode === "throws" && error.reason._tag === "SocketUpgradeError") {
          assert.strictEqual(error.reason.cause, cause)
        }
      }))

    it.effect("delivers bytes buffered before receiving exactly once", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const delivered = yield* Deferred.make<void>()
        const received: Array<number> = []
        stream.push(Buffer.from([1, 2]))
        const reading = yield* transport.run((bytes) => {
          received.push(...bytes as Uint8Array)
          return Deferred.succeed(delivered, void 0)
        }).pipe(Effect.forkChild)
        yield* Deferred.await(delivered)
        yield* Fiber.interrupt(reading)
        stream.push(Buffer.from([3]))
        assert.deepStrictEqual(Array.from((yield* transport.pull)[0] as Uint8Array), [3])
        assert.deepStrictEqual(received, [1, 2])
      }))

    it.effect("preserves queued and native buffered bytes when a backpressured receive loop is interrupted", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const reading = yield* transport.run(() => {
          stream.emit("data", Buffer.from([2]))
          return Effect.never
        }).pipe(Effect.forkChild({ startImmediately: true }))
        stream.emit("data", Buffer.from([1]))
        stream.push(Buffer.from([3]))
        yield* Fiber.interrupt(reading)
        assert.deepStrictEqual(Array.from((yield* transport.pull)[0] as Uint8Array), [2])
        assert.deepStrictEqual(Array.from((yield* transport.pull)[0] as Uint8Array), [3])
        const delivered = yield* Deferred.make<void>()
        const next = yield* transport.run(() =>
          Deferred.succeed(delivered, void 0)
        ).pipe(Effect.forkChild)
        stream.push(Buffer.from([4]))
        yield* Deferred.await(delivered)
        yield* Fiber.interrupt(next)
      }))

    it.live("switches a native connection from paused receiving back to pulling", () =>
      Effect.gen(function*() {
        const server = yield* listen(Net.createServer(echo))
        const transport = yield* make().connect(address(server))
        const entered = yield* Deferred.make<void>()
        const received: Array<string> = []
        const reading = yield* transport.run((bytes) => {
          received.push(Buffer.from(bytes as Uint8Array).toString())
          return Deferred.succeed(entered, void 0).pipe(Effect.andThen(Effect.never))
        }).pipe(Effect.forkChild)
        yield* transport.write("first")
        yield* Deferred.await(entered)
        yield* transport.write("second")
        yield* Fiber.interrupt(reading)
        assert.strictEqual(Buffer.from((yield* transport.pull)[0]).toString(), "second")
        assert.deepStrictEqual(received, ["first"])
      }))

    it.effect("delivers receive callbacks synchronously and releases interrupted consumers", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const received: Array<Array<number>> = []
        const reading = yield* transport.run((bytes) => {
          received.push(Array.from(bytes as Uint8Array))
        }).pipe(Effect.forkChild({ startImmediately: true }))
        stream.emit("data", Buffer.from([1, 2]))
        assert.deepStrictEqual(received, [[1, 2]])
        yield* Fiber.interrupt(reading)
        stream.push(Buffer.from([3]))
        assert.deepStrictEqual(Array.from((yield* transport.pull)[0] as Uint8Array), [3])
      }))

    it.effect("suspends further reads while a receive callback is backpressured", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const release = yield* Deferred.make<void>()
        const delivered = yield* Deferred.make<void>()
        const received: Array<Array<number>> = []
        const reading = yield* transport.run((bytes) => {
          received.push(Array.from(bytes as Uint8Array))
          return received.length === 1 ? Deferred.await(release) : Deferred.succeed(delivered, void 0)
        }).pipe(Effect.forkChild({ startImmediately: true }))
        stream.emit("data", Buffer.from([1]))
        stream.push(Buffer.from([2]))
        assert.deepStrictEqual(received, [[1]])
        yield* Deferred.succeed(release, void 0)
        yield* Deferred.await(delivered)
        assert.deepStrictEqual(received, [[1], [2]])
        yield* Fiber.interrupt(reading)
      }))

    it.effect("continues after completed callback effects and inherits the receive context", () =>
      Effect.gen(function*() {
        const setting = Context.Reference<number>("SocketConnector/ReceiveSetting", { defaultValue: () => 0 })
        const { stream, transport } = yield* held(make)
        const received: Array<number> = []
        const reading = yield* transport.run((bytes) => {
          if ((bytes as Uint8Array)[0] === 1) stream.emit("data", Buffer.from([2]))
          return Effect.map(setting, (value) => {
            received.push((bytes as Uint8Array)[0] + value)
          })
        }).pipe(Effect.provideService(setting, 10), Effect.forkChild({ startImmediately: true }))
        stream.emit("data", Buffer.from([1]))
        assert.deepStrictEqual(received, [11, 12])
        yield* Fiber.interrupt(reading)
      }))

    it.effect("closing a receive loop interrupts its suspended callback", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const stopped = yield* Deferred.make<void>()
        const reading = yield* transport.run(() =>
          Effect.never.pipe(Effect.ensuring(Deferred.succeed(stopped, void 0)))
        ).pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
        stream.emit("data", Buffer.from([1]))
        yield* transport.close
        assert.strictEqual((yield* Fiber.join(reading)).reason._tag, "SocketCloseError")
        yield* Deferred.await(stopped)
      }))

    it.effect("owns callbacks that close the connection during task startup", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const stopped = yield* Deferred.make<void>()
        const reading = yield* transport.run(() =>
          transport.close.pipe(
            Effect.andThen(Effect.never),
            Effect.ensuring(Deferred.succeed(stopped, void 0))
          )
        ).pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
        stream.emit("data", Buffer.from([1]))
        assert.strictEqual((yield* Fiber.join(reading)).reason._tag, "SocketCloseError")
        yield* Deferred.await(stopped)
      }))

    it.effect("retains receive callback exceptions as read error causes", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const cause = new Error("Malformed frame")
        const reading = yield* transport.run(() => {
          throw cause
        }).pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
        stream.emit("data", Buffer.from([1]))
        const failure = yield* Fiber.join(reading)
        assert.strictEqual(failure.reason._tag, "SocketReadError")
        if (failure.reason._tag === "SocketReadError") assert.strictEqual(failure.reason.cause, cause)
      }))

    it.live.each([false, true])("closes a native connection while a write is backpressured (vector: %s)", (vector) =>
      Effect.gen(function*() {
        let peer: Net.Socket | undefined
        const server = yield* listen(Net.createServer((socket) => {
          peer = socket
          socket.pause()
        }))
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            peer?.destroy()
          })
        )
        const connection = yield* make().connect(address(server))
        const bytes = new Uint8Array(16 * 1024 * 1024 + 2)
        bytes[0] = 1
        bytes[bytes.length - 1] = 2
        const writing = yield* (vector
          ? connection.writeAll([bytes.subarray(1, 8 * 1024 * 1024), bytes.subarray(8 * 1024 * 1024, -1)])
          : connection.write(bytes.subarray(1, -1))).pipe(Effect.flip, Effect.forkChild)
        yield* Effect.yieldNow
        assert.isUndefined(writing.pollUnsafe())
        yield* connection.close
        const error = yield* Fiber.join(writing).pipe(Effect.timeout("1 second"))
        assert.strictEqual(error.reason._tag, "SocketWriteError")
      }))

    it.live.each([false, true])("writes sliced byte views in order over a native connection (TLS: %s)", (tls) =>
      Effect.gen(function*() {
        const server = yield* listen(tls ? Tls.createServer({ cert, key }, echo) : Net.createServer(echo))
        const connection = yield* make().connect({ ...address(server), tls: tls ? { ca: cert } : undefined })
        const bytes = new Uint8Array([9, 0, 13, 10, 255, 1, 2, 3, 4, 5, 6, 9])
        const snapshot = bytes.slice()
        const views = [bytes.subarray(1, 5), bytes.subarray(5, 7), bytes.subarray(7, 9)]
        const buffer = Buffer.from(bytes.buffer, 9, 2)
        const expected = [0, 13, 10, 255, 1, 2, 3, 4, 65, 5, 6]
        const received: Array<number> = []
        const complete = yield* Deferred.make<void>()
        const reading = yield* connection.run((chunk) => {
          received.push(...chunk as Uint8Array)
          if (received.length >= expected.length) {
            return Deferred.succeed(complete, void 0)
          }
        }).pipe(Effect.forkChild)
        yield* connection.write(views[0])
        yield* connection.writeAll([views[1]])
        yield* connection.writeAll([views[2], "A", buffer])
        yield* Deferred.await(complete)
        assert.deepStrictEqual(received, expected)
        assert.deepStrictEqual(bytes, snapshot)
        yield* Fiber.interrupt(reading)
      }))
    it.live("reports synchronous socket creation failures as open errors", () =>
      Effect.gen(function*() {
        const invalid = yield* make().connect({ ...endpoint, port: -1 }).pipe(Effect.flip)
        assert.strictEqual(invalid.reason._tag, "SocketOpenError")
        const custom = yield* make({
          stream: () => {
            throw new Error("Custom stream failed")
          }
        }).connect(endpoint).pipe(Effect.flip)
        assert.strictEqual(custom.reason._tag, "SocketOpenError")
      }))

    it.live("upgrades a connected TCP session to verified TLS", () =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        const connection = yield* make().connect(address(server))
        const receiving = yield* connection.run(() => {}).pipe(Effect.forkChild({ startImmediately: true }))
        yield* Fiber.interrupt(receiving)
        yield* connection.upgrade({ ca: cert, servername: "localhost" })
        yield* connection.writeAll(["hello", "world"])
        assert.strictEqual(Buffer.from((yield* connection.pull)[0]).toString(), "helloworld")
        yield* connection.close
        assert.strictEqual((yield* connection.write("late").pipe(Effect.flip)).reason._tag, "SocketCloseError")
      }))

    it.live("closes a TLS session with buffered vector writes", () =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        const connection = yield* make().connect(address(server))
        yield* connection.upgrade({ ca: cert, servername: "localhost" })
        yield* connection.writeAll([new Uint8Array(4096), new Uint8Array(4096)])
        yield* connection.close
        assert.strictEqual((yield* connection.write("late").pipe(Effect.flip)).reason._tag, "SocketCloseError")
      }))

    it.live("applies native TLS upgrade defaults and prebuilt trust contexts", () =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        let verified: string | undefined
        const connection = yield* make({
          tls: {
            secureContext: Tls.createSecureContext({ ca: cert }),
            servername: "localhost",
            minVersion: "TLSv1.2",
            checkServerIdentity(hostname, peer) {
              verified = hostname
              return Tls.checkServerIdentity(hostname, peer)
            }
          }
        }).connect(address(server))
        yield* connection.upgrade()
        yield* connection.write("native-defaults")
        assert.strictEqual(Buffer.from((yield* connection.pull)[0]).toString(), "native-defaults")
        assert.strictEqual(verified, "localhost")
      }))

    it.live("overrides native TLS defaults with portable upgrade settings", () =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        const connection = yield* make({ tls: { ca: cert, servername: "wrong.example" } }).connect(address(server))
        yield* connection.upgrade({ servername: "localhost" })
        yield* connection.write("portable-override")
        assert.strictEqual(Buffer.from((yield* connection.pull)[0]).toString(), "portable-override")
      }))

    it.live("combines a native client key with a portable upgrade certificate", () =>
      Effect.gen(function*() {
        const server = yield* listen(
          Tls.createServer({ cert, key, ca: cert, requestCert: true, rejectUnauthorized: true }, echo)
        )
        const connection = yield* make({ tls: { key, ca: cert, servername: "localhost" } }).connect(address(server))
        yield* connection.upgrade({ cert })
        yield* connection.write("client-certificate")
        assert.strictEqual(Buffer.from((yield* connection.pull)[0]).toString(), "client-certificate")
      }))

    it.live("verifies TLS certificates against a custom CA and hostname", () =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        server.on("tlsClientError", () => {})
        const connect = make().connect

        assert.isTrue(Exit.isFailure(yield* Effect.exit(connect({ ...address(server), tls: true }))))
        const wrongName = yield* connect({ ...address(server), tls: { ca: cert, servername: "wrong.example" } }).pipe(
          Effect.flip
        )
        assert.strictEqual(
          ("cause" in wrongName.reason ? wrongName.reason.cause as NodeJS.ErrnoException : undefined)!.code,
          "ERR_TLS_CERT_ALTNAME_INVALID"
        )

        const transport = yield* connect({ ...address(server), tls: { ca: cert } })
        yield* transport.write(new Uint8Array([0, 13, 10, 255]))
        assert.deepStrictEqual((yield* transport.pull)[0], new Uint8Array([0, 13, 10, 255]))
      }))

    it.live("resolves TLS hosts with a custom lookup", () =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        let resolved: string | undefined
        const lookup: Net.LookupFunction = (hostname, options, callback) => {
          resolved = hostname
          if (options.all) {
            callback(null, [{ address: "127.0.0.1", family: 4 }])
          } else callback(null, "127.0.0.1", 4)
        }
        const transport = yield* make({ tls: { lookup } }).connect({
          ...address(server),
          host: "redis.invalid",
          tls: { ca: cert, servername: "localhost" }
        })
        yield* transport.write(new Uint8Array([1]))
        assert.deepStrictEqual((yield* transport.pull)[0], new Uint8Array([1]))
        assert.strictEqual(resolved, "redis.invalid")
      }))

    it.live("sends queued writes after each drain and drops interrupted ones", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
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

    it.live.each([false, true])("terminates pending reads and writes on close (already closed: %s)", (closedFirst) =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const closed = new Promise<void>((resolve) =>
          stream.once("close", resolve)
        )
        const reading = yield* transport.pull.pipe(Effect.flip, Effect.forkChild)
        const inFlight = yield* transport.write(new Uint8Array([1])).pipe(Effect.flip, Effect.forkChild)
        yield* Effect.yieldNow
        const queued = yield* transport.write(new Uint8Array([2])).pipe(Effect.flip, Effect.forkChild)
        yield* Effect.yieldNow
        if (closedFirst) {
          stream.destroy()
          yield* Effect.promise(() =>
            closed
          )
        }
        yield* transport.close
        assert.strictEqual((yield* Fiber.join(reading)).reason._tag, "SocketCloseError")
        assert.strictEqual((yield* Fiber.join(inFlight)).reason._tag, "SocketWriteError")
        assert.strictEqual((yield* Fiber.join(queued)).reason._tag, "SocketCloseError")
        assert.deepStrictEqual(written(stream), [[1]])
        assert.isTrue(stream.destroyed)
        yield* Effect.promise(() =>
          closed
        )
        assert.strictEqual(stream.listenerCount("error"), 0)
      }))

    it.live("propagates stream errors and releases terminal listeners on close", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        const closed = new Promise<void>((resolve) =>
          stream.once("close", resolve)
        )
        const reading = yield* transport.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
        const cause = new Error("Active stream error")
        stream.emit("error", cause)
        const error = yield* Fiber.join(reading)
        assert.strictEqual(error.reason._tag, "SocketReadError")
        if (error.reason._tag === "SocketReadError") assert.strictEqual(error.reason.cause, cause)
        yield* Effect.promise(() => closed)
        assert.strictEqual(stream.listenerCount("error"), 0)
      }))

    it.live("closes the session after a synchronous write failure", () =>
      Effect.gen(function*() {
        const { stream, transport } = yield* held(make)
        stream.write = () => {
          throw new Error("Write failed")
        }
        assert.strictEqual((yield* transport.write("first").pipe(Effect.flip)).reason._tag, "SocketWriteError")
        assert.strictEqual((yield* transport.write("second").pipe(Effect.flip)).reason._tag, "SocketCloseError")
        assert.isTrue(stream.destroyed)
      }))

    it.live("reports a refused connection as an open error", () =>
      Effect.gen(function*() {
        const server = yield* listen(Net.createServer())
        const target = address(server)
        yield* Effect.callback<void>((resume) => {
          server.close(() => resume(Effect.void))
        })
        const error = yield* make().connect(target).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "SocketOpenError")
      }))

    it.effect("rejects an invalid connect timeout before opening a socket", () =>
      Effect.gen(function*() {
        let opened = 0
        for (const connectTimeout of [-1, NaN]) {
          const error = yield* make({
            connectTimeout,
            stream: () => {
              opened++
              return new HeldStream()
            }
          }).connect(endpoint).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "SocketOpenError")
        }
        assert.strictEqual(opened, 0)
      }))
  })
