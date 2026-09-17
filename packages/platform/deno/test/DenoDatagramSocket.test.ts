import * as Platform from "@effect/platform-deno/DenoDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Scope, Stream } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"

const loopback = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 0)

describe("DenoDatagramSocket", () => {
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
      const error = yield* socket.writer.write({ data: new Uint8Array([1]), destination: loopback }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketWriteError")
      assert.deepStrictEqual(
        error.reason,
        new Datagram.DatagramSocketWriteError({
          cause: error.cause,
          destination: loopback
        })
      )
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
