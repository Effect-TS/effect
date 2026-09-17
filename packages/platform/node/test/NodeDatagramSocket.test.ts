import * as NodeDatagramSocket from "@effect/platform-node/NodeDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scope } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Dgram from "node:dgram"
import { vi } from "vitest"
import { testLayer } from "../../../effect/test/unstable/socket/DatagramSocket.test-utils.ts"

vi.mock("node:dgram", async (importOriginal) => {
  const original = await importOriginal<typeof Dgram>()
  return { ...original, createSocket: vi.fn(original.createSocket) }
})

const native = await vi.importActual<typeof Dgram>("node:dgram")
const loopback = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 0)
const currentNative = () => vi.mocked(Dgram.createSocket).mock.results.at(-1)!.value as Dgram.Socket
const emitPacket = (socket: Dgram.Socket, bytes: ReadonlyArray<number>, source = "127.0.0.1") =>
  socket.emit("message", Uint8Array.from(bytes), { address: source, port: 12345, family: "IPv4", size: bytes.length })
const assertClosed = (error: Datagram.DatagramSocketError) => {
  assert.strictEqual(error.reason._tag, "DatagramSocketClosedError")
}

const bind = (localAddress: NetAddress.InetAddress) =>
  NodeDatagramSocket.bind({ localAddress }).pipe(Effect.map((socket) => ({
    address: socket.address,
    socket: currentNative()
  })))

describe("NodeDatagramSocket", { concurrent: false }, () => {
  testLayer(NodeDatagramSocket.layer)
})

describe("NodeDatagramSocket binding", { concurrent: false }, () => {
  for (const host of ["127.0.0.1", "::1"]) {
    it.effect(`reports the bound address and releases ${host} with its scope`, () =>
      Effect.gen(function*() {
        const scope = yield* Scope.fork(yield* Effect.scope)
        const { address, socket } = yield* bind(NetAddress.inetAddressFromIpStringUnsafe(host, 0)).pipe(
          Scope.provide(scope)
        )
        assert.strictEqual(NetAddress.formatHost(address), host)
        assert.isAbove(address.port, 0)
        assert.strictEqual(socket.address().port, address.port)
        let closed = false
        socket.once("close", () => {
          closed = true
        })
        yield* Scope.close(scope, Exit.void)
        assert.isTrue(closed)
        assert.throws(() => socket.address(), /Not running/)
        const rebound = yield* bind(address)
        assert.deepStrictEqual(rebound.address, address)
      }))
  }

  it.effect("closes a failed bind before returning its native error", () =>
    Effect.gen(function*() {
      const occupied = yield* bind(loopback)
      const socket = native.createSocket("udp4")
      let closed = false
      socket.once("close", () => {
        closed = true
      })
      vi.mocked(Dgram.createSocket).mockReturnValueOnce(socket)
      const error = yield* bind(occupied.address).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
      assert.strictEqual((error.cause as NodeJS.ErrnoException).code, "EADDRINUSE")
      assert.isTrue(closed)
      assert.throws(() => socket.address(), /Not running/)
      assert.strictEqual(occupied.socket.address().port, occupied.address.port)
    }))

  it.effect("interruption closes a pending bind without waiting for lookup", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      let finishLookup!: () => void
      const socket = native.createSocket({
        type: "udp4",
        lookup: (hostname, _options, callback) => {
          finishLookup = () => callback(null, hostname, 4)
          Deferred.doneUnsafe(started, Effect.void)
        }
      })
      let closed = false
      let listened = false
      socket.once("close", () => {
        closed = true
      })
      socket.once("listening", () => {
        listened = true
      })
      vi.mocked(Dgram.createSocket).mockReturnValueOnce(socket)
      const fiber = yield* bind(loopback).pipe(Effect.forkChild)
      yield* Deferred.await(started)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(fiber)))
      assert.isTrue(closed)
      finishLookup()
      assert.isFalse(listened)
      assert.throws(() => socket.address(), /Not running/)
    }))
})

// Deterministic boundary cases use events on real sockets; delivery tests use loopback UDP.
describe("NodeDatagramSocket I/O", { concurrent: false }, () => {
  it.effect("converts scoped IPv6 sources", () =>
    Effect.gen(function*() {
      const socket = yield* NodeDatagramSocket.bind({ localAddress: loopback })
      const data = new Uint8Array([1, 2])
      currentNative().emit("message", data, { address: "fe80::1%7", port: 12345 })
      const [packet] = yield* socket.reader.pull
      assert.deepStrictEqual(Array.from(packet.data), [1, 2])
      assert.deepStrictEqual(packet.source, NetAddress.inetAddressFromStringUnsafe("[fe80::1%7]:12345"))
    }))

  it.effect("reports native receive errors to pending and future reads", () =>
    Effect.gen(function*() {
      const socket = yield* NodeDatagramSocket.bind({ localAddress: loopback })
      const native = currentNative()
      const waiting = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const cause = new Error("receive failed")
      emitPacket(native, [1])
      native.emit("error", cause)
      const error = yield* Fiber.join(waiting)
      assert.strictEqual(error.reason._tag, "DatagramSocketReadError")
      assert.strictEqual(error.cause, cause)
      assert.strictEqual(yield* socket.reader.pull.pipe(Effect.flip), error)
      yield* socket.writer.write({ data: new Uint8Array(), destination: socket.address })
      assert.strictEqual(native.address().port, socket.address.port)
    }))

  it.effect("preserves synchronous and asynchronous native send failures and their destination", () =>
    Effect.gen(function*() {
      const socket = yield* NodeDatagramSocket.bind({ localAddress: loopback })
      const native = currentNative()
      const invalid = { data: new Uint8Array([1]), destination: loopback }
      const error = yield* socket.writer.write(invalid).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketWriteError")
      assert.strictEqual((error.cause as NodeJS.ErrnoException).code, "ERR_SOCKET_BAD_PORT")
      assert.deepStrictEqual(
        error.reason,
        new Datagram.DatagramSocketWriteError({
          cause: error.cause,
          destination: invalid.destination
        })
      )
      const cause = new Error("send failed")
      vi.spyOn(native, "send").mockImplementationOnce((...args: Array<unknown>) => {
        const callback = args.at(-1) as (error: Error) => void
        queueMicrotask(() => callback(cause))
      })
      const failure = yield* socket.writer.write({ ...invalid, destination: socket.address }).pipe(Effect.flip)
      assert.strictEqual(failure.cause, cause)
      assert.deepStrictEqual(
        failure.reason,
        new Datagram.DatagramSocketWriteError({
          cause,
          destination: socket.address
        })
      )
    }))

  it.effect("fails a native send awaiting lookup when the binding closes", () =>
    Effect.gen(function*() {
      const submitted = yield* Deferred.make<void>()
      let lookups = 0
      let finish!: () => void
      const nativeSocket = native.createSocket({
        type: "udp4",
        lookup: (host, _options, callback) => {
          if (lookups++ === 0) queueMicrotask(() => callback(null, host, 4))
          else {
            finish = () => callback(null, host, 4)
            Deferred.doneUnsafe(submitted, Effect.void)
          }
        }
      })
      vi.mocked(Dgram.createSocket).mockReturnValueOnce(nativeSocket)
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* NodeDatagramSocket.bind({ localAddress: loopback }).pipe(Scope.provide(scope))
      const sending = yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address }).pipe(
        Effect.flip,
        Effect.forkChild
      )
      yield* Deferred.await(submitted)
      yield* Scope.close(scope, Exit.void)
      assertClosed(yield* Fiber.join(sending))
      finish()
    }))
})

describe("NodeDatagramSocket connected sockets", { concurrent: false }, () => {
  it.effect("filters other senders when the runtime delivers them after association", () =>
    Effect.gen(function*() {
      const peer = yield* NodeDatagramSocket.bind({ localAddress: loopback })
      const client = yield* NodeDatagramSocket.connect({ localAddress: loopback, remote: peer.address })
      const native = currentNative()
      native.emit("message", new Uint8Array([9]), { address: "127.0.0.2", port: peer.address.port })
      native.emit("message", new Uint8Array([9]), { address: "127.0.0.1", port: peer.address.port + 1 })
      yield* peer.writer.write({ data: new Uint8Array([1]), destination: client.address })
      const packets = yield* client.reader.pull
      assert.strictEqual(packets.length, 1)
      assert.deepStrictEqual(Array.from(packets[0].data), [1])
      assert.deepStrictEqual(packets[0].source, peer.address)
    }))

  it.effect("discards packets received before peer association completes", () =>
    Effect.gen(function*() {
      const peer = yield* NodeDatagramSocket.bind({ localAddress: loopback })
      const nativeSocket = native.createSocket("udp4")
      const connect = nativeSocket.connect.bind(nativeSocket)
      vi.spyOn(nativeSocket, "connect").mockImplementationOnce((...args: Array<unknown>) => {
        emitPacket(nativeSocket, [9])
        connect(args[0] as number, args[1] as string, args[2] as () => void)
      })
      vi.mocked(Dgram.createSocket).mockReturnValueOnce(nativeSocket)
      const client = yield* NodeDatagramSocket.connect({ localAddress: loopback, remote: peer.address })
      yield* peer.writer.write({ data: new Uint8Array([1]), destination: client.address })
      assert.deepStrictEqual(Array.from((yield* client.reader.pull)[0].data), [1])
    }))

  for (const [host, wildcard] of [["127.0.0.1", "0.0.0.0"], ["::1", "::"]]) {
    it.effect(`associates ${host} natively and resolves its wildcard local address`, () =>
      Effect.gen(function*() {
        const localAddress = NetAddress.inetAddressFromIpStringUnsafe(host, 0)
        const peer = yield* Datagram.bind({ localAddress })
        const client = yield* Datagram.connect({
          localAddress: NetAddress.inetAddressFromIpStringUnsafe(wildcard, 0),
          remote: peer.address
        })
        const remote = currentNative().remoteAddress()
        assert.strictEqual(remote.address, host)
        assert.strictEqual(remote.port, peer.address.port)
        assert.deepStrictEqual(client.remote, peer.address)
        assert.strictEqual(NetAddress.formatHost(client.address), host)
      }).pipe(Effect.provide(NodeDatagramSocket.layer)))
  }

  it.effect("closes the bound socket if native peer association fails", () =>
    Effect.gen(function*() {
      const error = yield* NodeDatagramSocket.connect({
        localAddress: loopback,
        remote: NetAddress.inetAddressFromIpStringUnsafe("::1", 12345)
      }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
      assert.instanceOf(error.cause, Error)
      assert.throws(() => currentNative().address(), /Not running/)
    }))

  it.effect("interrupts native peer association and handles its late lookup completion", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      let lookups = 0
      let finish!: () => void
      const socket = native.createSocket({
        type: "udp4",
        lookup: (hostname, _options, callback) => {
          if (lookups++ === 0) {
            queueMicrotask(() => callback(null, hostname, 4))
          } else {
            finish = () => callback(null, hostname, 4)
            Deferred.doneUnsafe(started, Effect.void)
          }
        }
      })
      vi.mocked(Dgram.createSocket).mockReturnValueOnce(socket)
      const connecting = yield* NodeDatagramSocket.connect({
        localAddress: loopback,
        remote: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
      }).pipe(Effect.forkChild)
      yield* Deferred.await(started)
      yield* Fiber.interrupt(connecting)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(connecting)))
      assert.throws(() => socket.address(), /Not running/)
      finish()
    }))
})

describe("NodeDatagramSocket acquisition scope", { concurrent: false }, () => {
  for (const operation of ["bind", "connect"] as const) {
    it.effect(`settles pending ${operation} when another fiber closes its owning scope`, () =>
      Effect.gen(function*() {
        const started = yield* Deferred.make<void>()
        let lookups = 0
        let finish!: () => void
        const nativeSocket = native.createSocket({
          type: "udp4",
          lookup: (host, _options, callback) => {
            if (operation === "connect" && lookups++ === 0) {
              queueMicrotask(() => callback(null, host, 4))
            } else {
              finish = () => callback(null, host, 4)
              Deferred.doneUnsafe(started, Effect.void)
            }
          }
        })
        vi.mocked(Dgram.createSocket).mockReturnValueOnce(nativeSocket)
        const scope = yield* Scope.fork(yield* Effect.scope)
        const options = {
          localAddress: loopback,
          remote: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
        }
        const acquire = operation === "bind"
          ? NodeDatagramSocket.bind(options).pipe(Effect.asVoid)
          : NodeDatagramSocket.connect(options).pipe(Effect.asVoid)
        const opening = yield* acquire.pipe(
          Scope.provide(scope),
          Effect.flip,
          Effect.forkChild
        )
        yield* Deferred.await(started)
        yield* Scope.close(scope, Exit.void)
        assertClosed(yield* Fiber.join(opening))
        assert.throws(() => nativeSocket.address(), /Not running/)
        finish()
      }))
  }
})
