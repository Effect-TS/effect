import * as NodeDatagramSocket from "@effect/platform-node/NodeDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scope, Stream } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Dgram from "node:dgram"
import { vi } from "vitest"

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

const open = NodeDatagramSocket.bind
const openConnected = NodeDatagramSocket.connect

const bind = (localAddress: NetAddress.InetAddress) =>
  open({ localAddress }).pipe(Effect.map((socket) => ({
    address: socket.address,
    socket: currentNative()
  })))

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

  it.effect("replacement is a new endpoint with a fresh buffer and an independent writer", () =>
    Effect.gen(function*() {
      const peer = yield* open({ localAddress: loopback })
      const firstScope = yield* Scope.fork(yield* Effect.scope)
      const first = yield* open({ localAddress: loopback }).pipe(Scope.provide(firstScope))
      const oldNative = currentNative()
      emitPacket(oldNative, [9])
      yield* Scope.close(firstScope, Exit.void)
      assert.throws(() => oldNative.address(), /Not running/)
      assertClosed(yield* first.reader.pull.pipe(Effect.flip))
      const next = yield* open({ localAddress: first.address })
      const nextNative = currentNative()
      assert.notStrictEqual(nextNative, oldNative)
      assertClosed(
        yield* first.writer.write({ data: new Uint8Array([1]), destination: peer.address }).pipe(Effect.flip)
      )
      yield* next.writer.write({ data: new Uint8Array([2]), destination: peer.address })
      const [packet] = yield* peer.reader.pull
      assert.deepStrictEqual(packet.source, next.address)
      assert.deepStrictEqual(Array.from(packet.data), [2])
      emitPacket(nextNative, [3])
      assert.deepStrictEqual((yield* next.reader.pull).map((packet) => Array.from(packet.data)), [[3]])
    }))

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
  for (const host of ["127.0.0.1", "::1"]) {
    it.effect(`preserves payloads, empty packets, and sources over ${host}`, () =>
      Effect.gen(function*() {
        const localAddress = NetAddress.inetAddressFromIpStringUnsafe(host, 0)
        const receiver = yield* open({ localAddress })
        const sender = yield* open({ localAddress })
        yield* Effect.forEach(
          [
            { data: new Uint8Array([1, 2]), destination: receiver.address },
            { data: new Uint8Array(), destination: receiver.address },
            { data: new Uint8Array([3]), destination: receiver.address }
          ],
          Effect.fnUntraced(function*(packet) {
            assert.isUndefined(yield* sender.writer.write(packet))
          }),
          { discard: true }
        )
        const packets = yield* Datagram.toStream(receiver).pipe(Stream.take(3), Stream.runCollect)
        assert.deepStrictEqual(packets.map((packet) => Array.from(packet.data)), [[1, 2], [], [3]])
        for (const packet of packets) assert.deepStrictEqual(packet.source, sender.address)
      }))
  }

  it.effect("owns received storage and converts scoped IPv6 sources", () =>
    Effect.gen(function*() {
      const socket = yield* open({ localAddress: loopback })
      const data = new Uint8Array([1, 2])
      currentNative().emit("message", data, { address: "fe80::1%7", port: 12345 })
      data.fill(9)
      const [packet] = yield* socket.reader.pull
      assert.deepStrictEqual(Array.from(packet.data), [1, 2])
      assert.deepStrictEqual(packet.source, NetAddress.inetAddressFromStringUnsafe("[fe80::1%7]:12345"))
    }))

  it.effect("concurrent pulls consume distinct batches in order", () =>
    Effect.gen(function*() {
      const socket = yield* open({ localAddress: loopback, readBatchSize: 1 })
      const first = yield* socket.reader.pull.pipe(Effect.forkChild({ startImmediately: true }))
      const second = yield* socket.reader.pull.pipe(Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      assert.isUndefined(first.pollUnsafe())
      assert.isUndefined(second.pollUnsafe())
      emitPacket(currentNative(), [1])
      emitPacket(currentNative(), [2])
      assert.deepStrictEqual((yield* Fiber.join(first)).map((packet) => Array.from(packet.data)), [[1]])
      assert.deepStrictEqual((yield* Fiber.join(second)).map((packet) => Array.from(packet.data)), [[2]])
    }))

  it.effect("interrupts a receive without closing the endpoint", () =>
    Effect.gen(function*() {
      const socket = yield* open({ localAddress: loopback, receiveCapacityBytes: 1 })
      const waiting = yield* socket.reader.pull.pipe(Effect.forkChild({ startImmediately: true }))
      yield* Fiber.interrupt(waiting)
      emitPacket(currentNative(), [8])
      assert.deepStrictEqual(Array.from((yield* socket.reader.pull)[0].data), [8])
      emitPacket(currentNative(), [9])
      assert.deepStrictEqual(Array.from((yield* socket.reader.pull)[0].data), [9])
    }))

  it.effect("closing the endpoint fails pending and future reads and writes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* open({ localAddress: loopback }).pipe(Scope.provide(scope))
      const waiting = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const another = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      yield* Scope.close(scope, Exit.void)
      assertClosed(yield* Fiber.join(another))
      assertClosed(yield* Fiber.join(waiting))
      assertClosed(yield* socket.reader.pull.pipe(Effect.flip))
      assertClosed(
        yield* socket.writer.write({ data: new Uint8Array(), destination: socket.address }).pipe(Effect.flip)
      )
    }))

  it.effect("reports native receive errors to pending and future reads", () =>
    Effect.gen(function*() {
      const socket = yield* open({ localAddress: loopback })
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
      const socket = yield* open({ localAddress: loopback })
      const native = currentNative()
      const invalid = { data: new Uint8Array([1]), destination: loopback }
      const error = yield* socket.writer.write(invalid).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketWriteError")
      assert.strictEqual((error.cause as NodeJS.ErrnoException).code, "ERR_SOCKET_BAD_PORT")
      const cause = new Error("send failed")
      vi.spyOn(native, "send").mockImplementationOnce((...args: Array<unknown>) => {
        const callback = args.at(-1) as (error: Error) => void
        queueMicrotask(() => callback(cause))
      })
      const failure = yield* socket.writer.write({ ...invalid, destination: socket.address }).pipe(Effect.flip)
      assert.strictEqual(failure.cause, cause)
      assert.strictEqual(failure.reason._tag, "DatagramSocketWriteError")
      if (failure.reason._tag === "DatagramSocketWriteError") {
        assert.deepStrictEqual(failure.reason.destination, socket.address)
      }
    }))

  it.effect("cancels one native send without completing or interrupting another", () =>
    Effect.gen(function*() {
      const socket = yield* open({ localAddress: loopback })
      const native = currentNative()
      const baseline = native.listenerCount("close")
      const callbacks: Array<() => void> = []
      vi.spyOn(native, "send").mockImplementation((...args: Array<unknown>) => {
        callbacks.push(args.at(-1) as () => void)
      })
      const packet = { data: new Uint8Array([1]), destination: socket.address }
      const first = yield* socket.writer.write(packet).pipe(Effect.forkChild({ startImmediately: true }))
      const second = yield* socket.writer.write(packet).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Fiber.interrupt(first)
      callbacks[0]()
      assert.isUndefined(second.pollUnsafe())
      callbacks[1]()
      yield* Fiber.join(second)
      assert.strictEqual(native.listenerCount("close"), baseline)
    }))

  it.effect("does not replay a closed native send on a replacement endpoint", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* open({ localAddress: loopback }).pipe(Scope.provide(scope))
      let finish!: () => void
      vi.spyOn(currentNative(), "send").mockImplementationOnce((...args: Array<unknown>) => {
        finish = args.at(-1) as () => void
      })
      const sending = yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      yield* Scope.close(scope, Exit.void)
      assertClosed(yield* Fiber.join(sending).pipe(Effect.flip))
      const next = yield* open({ localAddress: loopback })
      const send = vi.spyOn(currentNative(), "send")
      finish()
      assert.strictEqual(send.mock.calls.length, 0)
      yield* next.writer.write({ data: new Uint8Array([2]), destination: next.address })
      assert.strictEqual(send.mock.calls.length, 1)
      assert.deepStrictEqual(Array.from((yield* next.reader.pull)[0].data), [2])
    }))

  it.effect("rejects oversized writes before native submission and allows subsequent writes", () =>
    Effect.gen(function*() {
      const socket = yield* open({ localAddress: loopback, maxPacketBytes: 1 })
      const send = vi.spyOn(currentNative(), "send")
      const error = yield* socket.writer.write({
        data: new Uint8Array([2, 3]),
        destination: socket.address
      }).pipe(Effect.flip)
      assert.strictEqual(send.mock.calls.length, 0)
      assert.strictEqual(error.reason._tag, "DatagramSocketMessageTooLargeError")
      if (error.reason._tag === "DatagramSocketMessageTooLargeError") {
        assert.strictEqual(error.reason.size, 2)
        assert.strictEqual(error.reason.maxPacketBytes, 1)
      }
      yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address })
      assert.strictEqual(send.mock.calls.length, 1)
      assert.deepStrictEqual(Array.from((yield* socket.reader.pull)[0].data), [1])
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
      const socket = yield* open({ localAddress: loopback }).pipe(Scope.provide(scope))
      const sending = yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address }).pipe(
        Effect.flip,
        Effect.forkChild
      )
      yield* Deferred.await(submitted)
      yield* Scope.close(scope, Exit.void)
      assertClosed(yield* Fiber.join(sending))
      finish()
    }))

  for (const release of ["socket", "interrupt"] as const) {
    it.effect(`settles a pending write on ${release} while retaining independently owned native storage`, () =>
      Effect.gen(function*() {
        const scope = yield* Scope.fork(yield* Effect.scope)
        const socket = yield* open({ localAddress: loopback }).pipe(Scope.provide(scope))
        const native = currentNative()
        const submitted = yield* Deferred.make<void>()
        let data!: Uint8Array
        let finish!: () => void
        vi.spyOn(native, "send").mockImplementationOnce((...args: Array<unknown>) => {
          data = args[0] as Uint8Array
          finish = () => (args.at(-1) as () => void)()
          Deferred.doneUnsafe(submitted, Effect.void)
        })
        const input = new Uint8Array([1, 2])
        const sending = yield* socket.writer.write({ data: input, destination: socket.address }).pipe(
          Effect.exit,
          Effect.forkChild
        )
        yield* Deferred.await(submitted)
        if (release === "interrupt") {
          yield* Fiber.interrupt(sending)
          assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(sending)))
        } else {
          yield* Scope.close(scope, Exit.void)
          const result = yield* Fiber.join(sending)
          assertClosed(yield* Effect.flip(result))
        }
        input.fill(9)
        assert.deepStrictEqual(Array.from(data), [1, 2])
        finish()
      }))
  }
})

describe("NodeDatagramSocket connected sockets and adapters", { concurrent: false }, () => {
  it.effect("discards packets received before peer association completes", () =>
    Effect.gen(function*() {
      const peer = yield* open({ localAddress: loopback })
      const nativeSocket = native.createSocket("udp4")
      const connect = nativeSocket.connect.bind(nativeSocket)
      vi.spyOn(nativeSocket, "connect").mockImplementationOnce((...args: Array<unknown>) => {
        emitPacket(nativeSocket, [9])
        connect(args[0] as number, args[1] as string, args[2] as () => void)
      })
      vi.mocked(Dgram.createSocket).mockReturnValueOnce(nativeSocket)
      const client = yield* openConnected({ localAddress: loopback, remote: peer.address })
      yield* peer.writer.write({ data: new Uint8Array([1]), destination: client.address })
      assert.deepStrictEqual(Array.from((yield* client.reader.pull)[0].data), [1])
    }))

  for (const [host, wildcard] of [["127.0.0.1", "0.0.0.0"], ["::1", "::"]]) {
    it.effect(`associates ${host}, sends byte payloads, and filters other peers`, () =>
      Effect.gen(function*() {
        const localAddress = NetAddress.inetAddressFromIpStringUnsafe(host, 0)
        const peer = yield* Datagram.bind({ localAddress })
        const client = yield* Datagram.connect({
          localAddress: NetAddress.inetAddressFromIpStringUnsafe(wildcard, 0),
          remote: peer.address
        })
        assert.deepStrictEqual(client.remote, peer.address)
        assert.strictEqual(NetAddress.formatHost(client.address), host)
        assert.isUndefined(yield* client.writer.write(new Uint8Array()))
        assert.isUndefined(yield* client.writer.write(new Uint8Array([1, 2])))
        const packets = yield* Datagram.toStream(peer).pipe(Stream.take(2), Stream.runCollect)
        assert.deepStrictEqual(
          packets.map((packet) => Array.from(packet.data)),
          [[], [1, 2]]
        )
        for (const packet of packets) assert.deepStrictEqual(packet.source, client.address)
        const outsider = yield* Datagram.bind({ localAddress })
        yield* outsider.writer.write({ data: new Uint8Array([9]), destination: client.address })
        yield* peer.writer.write({ data: new Uint8Array([3]), destination: client.address })
        const received = yield* Datagram.toStream(client).pipe(Stream.take(1), Stream.runCollect)
        assert.deepStrictEqual(Array.from(received[0].data), [3])
        assert.deepStrictEqual(received[0].source, peer.address)
      }).pipe(Effect.provide(NodeDatagramSocket.layer)))
  }

  it.effect("rejects unspecified and zero-port peers before creating a native socket", () =>
    Effect.gen(function*() {
      const before = vi.mocked(Dgram.createSocket).mock.calls.length
      for (
        const remote of [
          loopback,
          NetAddress.inetAddressFromIpStringUnsafe("0.0.0.0", 12345),
          NetAddress.inetAddressFromIpStringUnsafe("::", 12345)
        ]
      ) {
        const error = yield* openConnected({ localAddress: loopback, remote }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "DatagramSocketInvalidOptionsError")
      }
      assert.strictEqual(vi.mocked(Dgram.createSocket).mock.calls.length, before)
    }))

  it.effect("closes the bound socket if native peer association fails", () =>
    Effect.gen(function*() {
      const error = yield* openConnected({
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
      const connecting = yield* openConnected({
        localAddress: loopback,
        remote: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345)
      }).pipe(Effect.forkChild)
      yield* Deferred.await(started)
      yield* Fiber.interrupt(connecting)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(connecting)))
      assert.throws(() => socket.address(), /Not running/)
      finish()
    }))

  it.effect("keeps receiving after upstream ends and leaves the endpoint open on downstream completion", () =>
    Effect.gen(function*() {
      const peer = yield* open({ localAddress: loopback })
      const socket = yield* NodeDatagramSocket.bind({ localAddress: loopback })
      const echo = yield* Effect.gen(function*() {
        const [packet] = yield* peer.reader.pull
        yield* peer.writer.write({ data: packet.data, destination: packet.source })
      }).pipe(Effect.forkChild)
      const packets = yield* Stream.succeed({ data: new Uint8Array([4, 5]), destination: peer.address }).pipe(
        Stream.pipeThroughChannel(Datagram.toChannel(socket)),
        Stream.take(1),
        Stream.runCollect
      )
      yield* Fiber.join(echo)
      assert.deepStrictEqual(Array.from(packets[0].data), [4, 5])
      assert.strictEqual(currentNative().address().port, socket.address.port)
      yield* peer.writer.write({ data: new Uint8Array([6]), destination: socket.address })
      assert.deepStrictEqual(Array.from((yield* socket.reader.pull)[0].data), [6])
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
          ? open(options).pipe(Effect.asVoid)
          : openConnected(options).pipe(Effect.asVoid)
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
