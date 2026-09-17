import * as Platform from "@effect/platform-bun/BunDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import * as Bun from "bun"
import { Deferred, Effect, Exit, Fiber, Scope, Stream } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import { vi } from "vitest"

vi.mock("bun", async (importOriginal) => {
  const original = await importOriginal<typeof Bun>()
  return { ...original, udpSocket: vi.fn(original.udpSocket) }
})

const native = await vi.importActual<typeof Bun>("bun")
const currentNative = () => vi.mocked(Bun.udpSocket).mock.results.at(-1)!.value as Promise<Bun.udp.Socket<"uint8array">>
const currentHandlers = () =>
  vi.mocked(Bun.udpSocket).mock.calls.at(-1)![0].socket! as Bun.udp.SocketHandler<"uint8array">

const loopback = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 0)

describe("BunDatagramSocket", { concurrent: false }, () => {
  for (const host of ["127.0.0.1", "::1"]) {
    it.effect(`preserves payloads, empty packets, and sources over ${host}`, () =>
      Effect.gen(function*() {
        const localAddress = NetAddress.inetAddressFromIpStringUnsafe(host, 0)
        const receiver = yield* Platform.bind({ localAddress })
        const sender = yield* Platform.bind({ localAddress })
        assert.strictEqual(NetAddress.formatHost(receiver.address), host)
        assert.isAbove(receiver.address.port, 0)
        for (const data of [new Uint8Array([1, 2]), new Uint8Array(), new Uint8Array([3])]) {
          yield* sender.writer.write({ data, destination: receiver.address })
        }
        const packets = yield* Datagram.toStream(receiver).pipe(Stream.take(3), Stream.runCollect)
        assert.deepStrictEqual(packets.map((packet) => Array.from(packet.data)), [[1, 2], [], [3]])
        for (const packet of packets) assert.deepStrictEqual(packet.source, sender.address)
      }))

    it.effect(`connects to a peer and filters other senders over ${host}`, () =>
      Effect.gen(function*() {
        const localAddress = NetAddress.inetAddressFromIpStringUnsafe(host, 0)
        const peer = yield* Datagram.bind({ localAddress })
        const stranger = yield* Datagram.bind({ localAddress })
        const client = yield* Datagram.connect({ localAddress, remote: peer.address })
        assert.deepStrictEqual(client.remote, peer.address)
        yield* client.writer.write(new Uint8Array())
        yield* client.writer.write(new Uint8Array([1, 2]))
        const packets = yield* Datagram.toStream(peer).pipe(Stream.take(2), Stream.runCollect)
        assert.deepStrictEqual(packets.map((packet) => Array.from(packet.data)), [[], [1, 2]])
        for (const packet of packets) assert.deepStrictEqual(packet.source, client.address)
        yield* stranger.writer.write({ data: new Uint8Array([9]), destination: client.address })
        yield* peer.writer.write({ data: new Uint8Array([3]), destination: client.address })
        const [reply] = yield* client.reader.pull
        assert.deepStrictEqual(Array.from(reply.data), [3])
        assert.deepStrictEqual(reply.source, peer.address)
      }).pipe(Effect.provide(Platform.layer)))
  }

  it.effect("reports occupied bindings as open errors", () =>
    Effect.gen(function*() {
      const socket = yield* Platform.bind({ localAddress: loopback })
      const error = yield* Platform.bind({ localAddress: socket.address }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
      assert.instanceOf(error.cause, Error)
      yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address })
      assert.deepStrictEqual(Array.from((yield* socket.reader.pull)[0].data), [1])
    }))

  it.effect("preserves the destination of native send failures", () =>
    Effect.gen(function*() {
      const socket = yield* Platform.bind({ localAddress: loopback })
      const nativeSocket = yield* Effect.promise(currentNative)
      const cause = new Error("send failed")
      vi.spyOn(nativeSocket, "send").mockImplementationOnce(() => {
        throw cause
      })
      const error = yield* socket.writer.write({ data: new Uint8Array([1]), destination: loopback }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketWriteError")
      assert.strictEqual(error.cause, cause)
      assert.deepStrictEqual(
        error.reason,
        new Datagram.DatagramSocketWriteError({
          cause: error.cause,
          destination: loopback
        })
      )
    }))

  it.effect("retries backpressured sends on drain and removes interrupted sends", () =>
    Effect.gen(function*() {
      const socket = yield* Platform.bind({ localAddress: loopback })
      const nativeSocket = yield* Effect.promise(currentNative)
      const handlers = currentHandlers()
      const send = vi.spyOn(nativeSocket, "send").mockReturnValue(false)
      const cancelled = yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      yield* Fiber.interrupt(cancelled)
      const waiting = yield* socket.writer.write({ data: new Uint8Array([2]), destination: socket.address }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      assert.strictEqual(send.mock.calls.length, 2)
      send.mockReturnValue(true)
      handlers.drain!(nativeSocket)
      yield* Fiber.join(waiting)
      assert.strictEqual(send.mock.calls.length, 3)
      assert.deepStrictEqual(Array.from(send.mock.calls[2][0] as Uint8Array), [2])
      handlers.drain!(nativeSocket)
      assert.strictEqual(send.mock.calls.length, 3)
    }))

  it.effect("settles backpressured sends when the binding scope closes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* Platform.bind({ localAddress: loopback }).pipe(Scope.provide(scope))
      const nativeSocket = yield* Effect.promise(currentNative)
      const handlers = currentHandlers()
      const send = vi.spyOn(nativeSocket, "send").mockReturnValue(false)
      const waiting = yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address }).pipe(
        Effect.flip,
        Effect.forkChild({ startImmediately: true })
      )
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Fiber.join(waiting)).reason._tag, "DatagramSocketClosedError")
      assert.isTrue(nativeSocket.closed)
      handlers.drain!(nativeSocket)
      assert.strictEqual(send.mock.calls.length, 1)
    }))

  it.effect("reports native errors to pending sends and pending and future reads", () =>
    Effect.gen(function*() {
      const socket = yield* Platform.bind({ localAddress: loopback })
      const nativeSocket = yield* Effect.promise(currentNative)
      const handlers = currentHandlers()
      vi.spyOn(nativeSocket, "send").mockReturnValue(false)
      const sending = yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address }).pipe(
        Effect.flip,
        Effect.forkChild({ startImmediately: true })
      )
      const reading = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      const cause = new Error("native error")
      handlers.error!(nativeSocket, cause)
      const writeError = yield* Fiber.join(sending)
      assert.strictEqual(writeError.cause, cause)
      assert.deepStrictEqual(
        writeError.reason,
        new Datagram.DatagramSocketWriteError({
          cause,
          destination: socket.address
        })
      )
      const readError = yield* Fiber.join(reading)
      assert.strictEqual(readError.reason._tag, "DatagramSocketReadError")
      assert.strictEqual(readError.cause, cause)
      assert.strictEqual(yield* Effect.flip(socket.reader.pull), readError)
    }))

  for (const operation of ["bind", "connect"] as const) {
    it.effect(`closes a late ${operation} acquisition after interruption`, () =>
      Effect.gen(function*() {
        const started = yield* Deferred.make<void>()
        let finish!: (socket: Bun.udp.ConnectedSocket<"uint8array">) => void
        vi.mocked(Bun.udpSocket).mockImplementationOnce(() => {
          Deferred.doneUnsafe(started, Effect.void)
          return new Promise((resolve) => {
            finish = resolve
          })
        })
        const options = { localAddress: loopback, remote: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 12345) }
        const acquire = operation === "bind" ? Platform.bind(options) : Platform.connect(options)
        const opening = yield* acquire.pipe(Effect.forkChild)
        yield* Deferred.await(started)
        yield* Fiber.interrupt(opening)
        assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(opening)))
        const socket = yield* Effect.acquireRelease(
          Effect.promise(() =>
            native.udpSocket({
              hostname: "127.0.0.1",
              port: 0,
              binaryType: "uint8array",
              connect: { hostname: "127.0.0.1", port: 12345 }
            })
          ),
          (socket) => Effect.sync(() => socket.close())
        )
        finish(socket)
        yield* Effect.promise(() => Promise.resolve())
        assert.isTrue(socket.closed)
      }))
  }

  it.effect("discards truncated datagrams and converts scoped IPv6 source addresses", () =>
    Effect.gen(function*() {
      const socket = yield* Platform.bind({ localAddress: loopback })
      const nativeSocket = yield* Effect.promise(currentNative)
      const handlers = currentHandlers()
      handlers.data!(nativeSocket, new Uint8Array([9]), 12345, "127.0.0.1", { truncated: true, ipv6: false })
      handlers.data!(nativeSocket, new Uint8Array([1]), 12345, "fe80::1%7", { truncated: false, ipv6: true })
      const packets = yield* socket.reader.pull
      assert.strictEqual(packets.length, 1)
      assert.deepStrictEqual(Array.from(packets[0].data), [1])
      assert.deepStrictEqual(packets[0].source, NetAddress.inetAddressFromStringUnsafe("[fe80::1%7]:12345"))
    }))

  it.effect("leaves the endpoint open after interrupting a receive", () =>
    Effect.gen(function*() {
      const socket = yield* Platform.bind({ localAddress: loopback })
      const receiving = yield* socket.reader.pull.pipe(Effect.forkChild({ startImmediately: true }))
      yield* Fiber.interrupt(receiving)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(receiving)))
      yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address })
      assert.deepStrictEqual(Array.from((yield* socket.reader.pull)[0].data), [1])
    }))

  it.effect("settles pending reads, rejects future operations, and releases the port on scope closure", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* Platform.bind({ localAddress: loopback }).pipe(Scope.provide(scope))
      const receiving = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Fiber.join(receiving)).reason._tag, "DatagramSocketClosedError")
      assert.strictEqual((yield* Effect.flip(socket.reader.pull)).reason._tag, "DatagramSocketClosedError")
      const error = yield* socket.writer.write({ data: new Uint8Array([1]), destination: socket.address }).pipe(
        Effect.flip
      )
      assert.strictEqual(error.reason._tag, "DatagramSocketClosedError")
      const rebound = yield* Platform.bind({ localAddress: socket.address })
      assert.deepStrictEqual(rebound.address, socket.address)
    }))
})
