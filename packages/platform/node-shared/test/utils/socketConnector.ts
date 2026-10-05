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

const connectedTcp = (server: Net.Server) =>
  Effect.acquireRelease(
    Effect.callback<Net.Socket>((resume) => {
      const socket = Net.createConnection(address(server))
      socket.once("connect", () => resume(Effect.succeed(socket)))
      socket.once("error", (cause) => resume(Effect.die(cause)))
      return Effect.sync(() => socket.destroy())
    }),
    (socket) => Effect.sync(() => socket.destroy())
  )
const identityFraming = {
  encode: (bytes: Uint8Array) => bytes,
  decode: (bytes: Uint8Array) => [bytes],
  onSecure: () => []
}

const handshakeFraming = () => {
  let pending = Buffer.alloc(0)
  let encoded = 0
  let decoded = 0
  let secured = 0
  return {
    encode(bytes: Uint8Array) {
      encoded++
      const frame = Buffer.alloc(bytes.length + 5)
      frame[0] = 253
      frame.writeUInt32BE(bytes.length, 1)
      frame.set(bytes, 5)
      return frame
    },
    decode(bytes: Uint8Array) {
      decoded++
      pending = Buffer.concat([pending, bytes])
      const chunks: Array<Uint8Array> = []
      while (pending.length >= 5 && pending.length >= pending.readUInt32BE(1) + 5) {
        const length = pending.readUInt32BE(1)
        assert.strictEqual(pending[0], 253)
        chunks.push(pending.subarray(5, length + 5))
        pending = pending.subarray(length + 5)
      }
      return chunks
    },
    onSecure() {
      secured++
      const chunks = pending.length === 0 ? [] : [pending]
      pending = Buffer.alloc(0)
      return chunks
    },
    counts: () => ({ encoded, decoded, secured }),
    hasPending: () => pending.length > 0
  }
}

const listenFramedTls = Effect.fnUntraced(function*(recordSizes?: Array<number>) {
  const backend = yield* listen(Tls.createServer({ cert, key, minVersion: "TLSv1.2", maxVersion: "TLSv1.2" }, echo))
  const peers: Array<Net.Socket> = []
  const proxy = yield* listen(Net.createServer((client) => {
    const remote = Net.createConnection(address(backend))
    peers.push(client, remote)
    const codec = handshakeFraming()
    let plain = false
    let records = Buffer.alloc(0)
    client.on("error", () => remote.destroy())
    remote.on("error", () => client.destroy())
    client.on("end", () => remote.end())
    remote.on("end", () => client.end())
    client.on("data", (chunk) => {
      const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk
      if (!plain && !codec.hasPending() && bytes[0] !== 253) plain = true
      if (plain) {
        if (recordSizes !== undefined) {
          records = Buffer.concat([records, bytes])
          while (records.length >= 5 && records.length >= records.readUInt16BE(3) + 5) {
            const length = records.readUInt16BE(3)
            if (records[0] === 23) recordSizes.push(length)
            records = records.subarray(length + 5)
          }
        }
        remote.write(bytes)
      } else {
        for (const chunk of codec.decode(bytes)) remote.write(chunk)
      }
    })
    remote.on("data", (chunk) => {
      const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk
      const output = plain ? bytes : codec.encode(bytes)
      // Exercise frames whose header and payload arrive on separate reads.
      client.write(output.subarray(0, 2))
      client.write(output.subarray(2))
    })
  }))
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      for (const peer of peers) peer.destroy()
    })
  )
  return proxy
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
const held = (connector: typeof NodeSocketConnector.make) =>
  Effect.gen(function*() {
    const stream = new HeldStream()
    const transport = yield* connector({ stream: () => stream }).connect(endpoint)
    return { stream, transport }
  })
const written = (stream: HeldStream) => stream.writes.map((bytes) => [...bytes])

export const socketConnectorTests = (name: string, make: typeof NodeSocketConnector.make) =>
  describe(name, () => {
    it.live("reports native ciphertext write callback errors after the handshake", () =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        const raw = yield* connectedTcp(server)
        const transport = yield* make({ stream: () => raw }).connect(address(server))
        yield* transport.upgrade({ ca: cert, servername: "localhost", handshakeFraming: identityFraming })
        const cause = new Error("Ciphertext write failed")
        raw.write = ((_bytes: Uint8Array, callback: (error?: Error) => void) => {
          queueMicrotask(() => callback(cause))
          return false
        }) as typeof raw.write
        const reading = yield* transport.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
        const error = yield* transport.write("callback-error").pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "SocketWriteError")
        const readError = yield* Fiber.join(reading)
        assert.strictEqual(readError.reason._tag, "SocketReadError")
        if (readError.reason._tag === "SocketReadError") assert.strictEqual(readError.reason.cause, cause)
      }))

    it.live("limits actual TLS application records after a framed handshake", () =>
      Effect.gen(function*() {
        const records: Array<number> = []
        const server = yield* listenFramedTls(records)
        const transport = yield* make({
          tls: {
            minVersion: "TLSv1.2",
            maxVersion: "TLSv1.2",
            ciphers: "ECDHE-RSA-AES128-GCM-SHA256"
          }
        }).connect(address(server))
        yield* transport.upgrade({ ca: cert, servername: "localhost", handshakeFraming: handshakeFraming() })
        yield* transport.setTlsMaxSendFragment!(512)
        const payload = new Uint8Array(4096).fill(7)
        const received: Array<number> = []
        const completed = yield* Deferred.make<void>()
        const reading = yield* transport.run((bytes) => {
          received.push(...bytes as Uint8Array)
          if (received.length >= payload.length) return Deferred.succeed(completed, void 0)
        }).pipe(Effect.forkChild)
        yield* transport.writeAll([payload.subarray(0, 1024), payload.subarray(1024)])
        yield* Deferred.await(completed)
        assert.deepStrictEqual(received, Array.from(payload))
        assert.isAbove(records.length, 1)
        // TLS 1.2 AES-GCM adds an 8-byte nonce and 16-byte authentication tag.
        for (const length of records) assert.isAtMost(length, 512 + 24)
        yield* Fiber.interrupt(reading)
      }))

    it.live.each(["end", "close"] as const)("terminates a pending TLS read on raw %s after the handshake", (event) =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        const raw = yield* connectedTcp(server)
        const transport = yield* make({
          stream: () =>
            raw
        }).connect(address(server))
        yield* transport.upgrade({ ca: cert, servername: "localhost", handshakeFraming: identityFraming })
        const reading = yield* transport.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
        raw.emit(event, false)
        assert.strictEqual(
          (yield* Fiber.join(reading).pipe(Effect.timeout("1 second"))).reason._tag,
          "SocketCloseError"
        )
        assert.isTrue(raw.destroyed)
      }))

    it.live.each(["end", "close", "error"] as const)(
      "terminates a framed TLS upgrade when raw transport emits %s",
      (event) =>
        Effect.gen(function*() {
          let peer: Net.Socket | undefined
          const server = yield* listen(Net.createServer((socket) => {
            peer = socket
            socket.on("error", () => {})
          }))
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => peer?.destroy())
          )
          const raw = yield* connectedTcp(server)
          const transport = yield* make({
            stream: () => raw
          }).connect(address(server))
          const upgrading = yield* transport.upgrade({ handshakeFraming: identityFraming }).pipe(
            Effect.flip,
            Effect.forkChild({ startImmediately: true })
          )
          const cause = new Error("Raw handshake transport failed")
          raw.emit(event, event === "error" ? cause : false)
          const error = yield* Fiber.join(upgrading).pipe(Effect.timeout("1 second"))
          assert.strictEqual(error.reason._tag, "SocketUpgradeError")
          if (event === "error" && error.reason._tag === "SocketUpgradeError") {
            assert.strictEqual(error.reason.cause, cause)
          }
          assert.isTrue(raw.destroyed)
        })
    )

    it.live("interrupts a stalled framed TLS handshake and removes raw listeners", () =>
      Effect.gen(function*() {
        let peer: Net.Socket | undefined
        const server = yield* listen(Net.createServer((socket) => {
          peer = socket
          socket.on("error", () => {})
        }))
        yield* Effect.addFinalizer(() => Effect.sync(() => peer?.destroy()))
        const raw = yield* connectedTcp(server)
        const originalEndListeners = raw.listeners("end")
        const transport = yield* make({ stream: () => raw }).connect(address(server))
        const upgrading = yield* transport.upgrade({ handshakeFraming: identityFraming }).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        yield* Fiber.interrupt(upgrading)
        assert.isTrue(raw.destroyed)
        assert.strictEqual(raw.listenerCount("data"), 0)
        assert.deepStrictEqual(raw.listeners("end"), originalEndListeners)
      }))

    it.live("fails pending reads and writes when an established framed TLS transport errors", () =>
      Effect.gen(function*() {
        let peer: Tls.TLSSocket | undefined
        const server = yield* listen(Tls.createServer({ cert, key }, (socket) => {
          peer = socket
          socket.on("error", () => {})
          socket.pause()
        }))
        yield* Effect.addFinalizer(() => Effect.sync(() => peer?.destroy()))
        const raw = yield* connectedTcp(server)
        const transport = yield* make({ stream: () => raw }).connect(address(server))
        yield* transport.upgrade({ ca: cert, servername: "localhost", handshakeFraming: identityFraming })
        raw.write = () => false
        const reading = yield* transport.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
        const writing = yield* transport.write(new Uint8Array(32768)).pipe(Effect.flip, Effect.forkChild)
        yield* Effect.yieldNow
        assert.isUndefined(writing.pollUnsafe())
        const cause = new Error("Raw TLS transport failed")
        raw.emit("error", cause)
        const readError = yield* Fiber.join(reading).pipe(Effect.timeout("1 second"))
        assert.strictEqual(readError.reason._tag, "SocketReadError")
        if (readError.reason._tag === "SocketReadError") assert.strictEqual(readError.reason.cause, cause)
        assert.strictEqual((yield* Fiber.join(writing)).reason._tag, "SocketWriteError")
        assert.isTrue(raw.destroyed)
      }))

    it.effect("rejects handshake framing on a direct TLS endpoint before opening it", () =>
      Effect.gen(function*() {
        let opened = false
        const error = yield* make({
          stream: () => {
            opened = true
            return new HeldStream()
          }
        }).connect({ ...endpoint, tls: { handshakeFraming: handshakeFraming() } }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "SocketOpenError")
        assert.isFalse(opened)
      }))

    it.live("frames a verified TLS handshake before switching to raw TLS records", () =>
      Effect.gen(function*() {
        const server = yield* listenFramedTls()
        const transport = yield* make({ tls: { minVersion: "TLSv1.2", maxVersion: "TLSv1.2" } }).connect(
          address(server)
        )
        const framing = handshakeFraming()
        yield* transport.upgrade({ ca: cert, servername: "localhost", handshakeFraming: framing })
        const counts = framing.counts()
        assert.isAbove(counts.encoded, 0)
        assert.isAbove(counts.decoded, 0)
        assert.strictEqual(counts.secured, 1)
        yield* transport.writeAll(["after", "handshake"])
        const received = yield* transport.pull
        assert.strictEqual(Buffer.concat(received.map((bytes) => Buffer.from(bytes))).toString(), "afterhandshake")
        assert.deepStrictEqual(framing.counts(), counts)
      }))

    it.live.each(["encode", "decode", "onSecure"] as const)("reports TLS framing hook exceptions (%s)", (hook) =>
      Effect.gen(function*() {
        const server = yield* listen(Tls.createServer({ cert, key }, echo))
        server.on("tlsClientError", () => {})
        const cause = new Error("Framing hook failed")
        const transport = yield* make().connect(address(server))
        const error = yield* transport.upgrade({
          ca: cert,
          servername: "localhost",
          handshakeFraming: {
            encode: (bytes) =>
              bytes,
            decode: (bytes) => [bytes],
            onSecure: () => [],
            [hook]: () => {
              throw cause
            }
          }
        }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "SocketUpgradeError")
        if (error.reason._tag === "SocketUpgradeError") {
          assert.strictEqual(error.reason.cause, cause)
        }
      }))

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
            if (mode === "throws") {
              throw cause
            }
            return false
          }
        })
        const transport = yield* make({
          stream: () =>
            tls
        }).connect(endpoint)
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
