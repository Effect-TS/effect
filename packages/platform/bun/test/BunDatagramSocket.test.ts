import * as Platform from "@effect/platform-bun/BunDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import * as Bun from "bun"
import { Deferred, Effect, Exit, Fiber, Scope } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import { vi } from "vitest"
import { testLayer } from "../../../effect/test/unstable/socket/DatagramSocket.test-utils.ts"

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
  testLayer(Platform.layer)

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
})
