import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scope, Stream } from "effect"
import type * as Layer from "effect/Layer"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"

const loopback = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 0)

export const suite = (name: string, layer: Layer.Layer<Datagram.DatagramSocketFactory>) => {
  describe(name, () => {
    it.layer(layer)((it) => {
      for (const host of ["127.0.0.1", "::1"]) {
        it.effect(`preserves payloads, empty packets, and sources over ${host}`, () =>
          Effect.gen(function*() {
            const localAddress = NetAddress.inetAddressFromIpStringUnsafe(host, 0)
            const receiver = yield* Datagram.bind({ localAddress })
            const sender = yield* Datagram.bind({ localAddress })
            assert.strictEqual(NetAddress.formatHost(receiver.address), host)
            assert.isAbove(receiver.address.port, 0)
            for (const data of [new Uint8Array([1, 2]), new Uint8Array(), new Uint8Array([3])]) {
              yield* sender.write({ data, peer: receiver.address })
            }
            const packets = yield* Datagram.toStream(receiver).pipe(Stream.take(3), Stream.runCollect)
            assert.deepStrictEqual(packets.map((packet) => Array.from(packet.data)), [[1, 2], [], [3]])
            for (const packet of packets) assert.deepStrictEqual(packet.peer, sender.address)
          }))

        it.effect(`connects to a peer and filters other senders over ${host}`, () =>
          Effect.gen(function*() {
            const localAddress = NetAddress.inetAddressFromIpStringUnsafe(host, 0)
            const peer = yield* Datagram.bind({ localAddress })
            const stranger = yield* Datagram.bind({ localAddress })
            const client = yield* Datagram.connect({ localAddress, remote: peer.address })
            assert.strictEqual(peer._tag, "UnconnectedSocket")
            assert.strictEqual(client._tag, "ConnectedSocket")
            assert.isTrue(Datagram.isDatagramSocket(peer))
            assert.isTrue(Datagram.isDatagramSocket(client))
            assert.deepStrictEqual(client.remote, peer.address)
            yield* client.write(new Uint8Array())
            yield* client.write(new Uint8Array([1, 2]))
            const packets = yield* Datagram.toStream(peer).pipe(Stream.take(2), Stream.runCollect)
            assert.deepStrictEqual(packets.map((packet) => Array.from(packet.data)), [[], [1, 2]])
            for (const packet of packets) assert.deepStrictEqual(packet.peer, client.address)
            yield* stranger.write({ data: new Uint8Array([9]), peer: client.address })
            yield* peer.write({ data: new Uint8Array([3]), peer: client.address })
            const [reply] = yield* client.pull
            assert.deepStrictEqual(Array.from(reply.data), [3])
            assert.deepStrictEqual(reply.peer, peer.address)
          }))
      }

      it.effect("sends batches to different destinations and connected peers", () =>
        Effect.gen(function*() {
          const first = yield* Datagram.bind({ localAddress: loopback })
          const second = yield* Datagram.bind({ localAddress: loopback })
          const sender = yield* Datagram.bind({ localAddress: loopback })
          yield* sender.writeMany([
            { data: new Uint8Array([1]), peer: first.address },
            { data: new Uint8Array(), peer: second.address },
            { data: new Uint8Array([2]), peer: first.address }
          ])
          assert.deepStrictEqual(
            (yield* Datagram.toStream(first).pipe(Stream.take(2), Stream.runCollect)).map((p) => Array.from(p.data)),
            [[1], [2]]
          )
          assert.deepStrictEqual(Array.from((yield* second.pull)[0].data), [])
          const connected = yield* Datagram.connect({ localAddress: loopback, remote: first.address })
          yield* connected.writeMany([new Uint8Array(), new Uint8Array([3])])
          assert.deepStrictEqual(
            (yield* Datagram.toStream(first).pipe(Stream.take(2), Stream.runCollect)).map((p) => Array.from(p.data)),
            [[], [3]]
          )
        }))

      it.effect("preserves every packet across several submission windows", () =>
        Effect.gen(function*() {
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const sender = yield* Datagram.connect({ localAddress: loopback, remote: peer.address })
          const payloads = Array.from({ length: 129 }, (_, i) => new Uint8Array([i]))
          const receiving = yield* Datagram.toStream(peer).pipe(
            Stream.take(payloads.length),
            Stream.runCollect,
            Effect.forkChild
          )
          yield* sender.writeMany(payloads)
          assert.deepStrictEqual(
            (yield* Fiber.join(receiving)).map((p) => Array.from(p.data)),
            payloads.map((p) => Array.from(p))
          )
        }))

      it.effect("preserves retained payloads across subsequent receives", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback })
          yield* socket.write({ data: new Uint8Array([1, 2]), peer: socket.address })
          const [first] = yield* socket.pull
          yield* socket.write({ data: new Uint8Array([3, 4]), peer: socket.address })
          const [second] = yield* socket.pull
          assert.deepStrictEqual(Array.from(first.data), [1, 2])
          assert.deepStrictEqual(Array.from(second.data), [3, 4])
        }))

      it.effect("accepts an IPv4-mapped IPv6 peer", () =>
        Effect.gen(function*() {
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const client = yield* Datagram.connect({
            localAddress: NetAddress.inetAddressFromIpStringUnsafe("::", 0),
            remote: NetAddress.inetAddressFromIpStringUnsafe("::ffff:127.0.0.1", peer.address.port)
          })

          yield* client.write(new Uint8Array([1]))
          yield* peer.pull
          yield* peer.write({
            data: new Uint8Array([2]),
            peer: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", client.address.port)
          })

          const [reply] = yield* client.pull
          assert.deepStrictEqual(Array.from(reply.data), [2])
          assert.strictEqual(reply.peer.port, peer.address.port)
          assert.deepStrictEqual(NetAddress.toCanonical(reply.peer.address), peer.address.address)
        }))

      it.effect("reports occupied bindings as open errors", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback })
          const error = yield* Datagram.bind({ localAddress: socket.address }).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
          assert.instanceOf(error.cause, Error)
          yield* socket.write({ data: new Uint8Array([1]), peer: socket.address })
          assert.deepStrictEqual(Array.from((yield* socket.pull)[0].data), [1])
        }))

      it.effect("leaves the endpoint open after interrupting a receive", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback })
          const receiving = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
          yield* Fiber.interrupt(receiving)
          assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(receiving)))
          yield* socket.write({ data: new Uint8Array([1]), peer: socket.address })
          assert.deepStrictEqual(Array.from((yield* socket.pull)[0].data), [1])
        }))

      it.effect("settles pending reads, rejects future operations, and releases the port on scope closure", () =>
        Effect.gen(function*() {
          const scope = yield* Scope.fork(yield* Effect.scope)
          const socket = yield* Datagram.bind({ localAddress: loopback }).pipe(Scope.provide(scope))
          const receiving = yield* socket.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
          yield* Scope.close(scope, Exit.void)
          assert.strictEqual((yield* Fiber.join(receiving)).reason._tag, "DatagramSocketClosedError")
          assert.strictEqual((yield* Effect.flip(socket.pull)).reason._tag, "DatagramSocketClosedError")
          const error = yield* socket.write({ data: new Uint8Array([1]), peer: socket.address }).pipe(
            Effect.flip
          )
          assert.strictEqual(error.reason._tag, "DatagramSocketClosedError")
          const rebound = yield* Datagram.bind({ localAddress: socket.address })
          assert.deepStrictEqual(rebound.address, socket.address)
        }))

      it.effect("keeps receiving after finite upstream completion", () =>
        Effect.gen(function*() {
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const socket = yield* Datagram.bind({ localAddress: loopback })
          const upstreamDone = yield* Deferred.make<void>()
          const exchange = yield* Effect.gen(function*() {
            const packets = yield* Datagram.toStream(peer).pipe(Stream.take(3), Stream.runCollect)
            yield* Deferred.await(upstreamDone)
            yield* peer.write({ data: new Uint8Array([42]), peer: socket.address })
            return packets
          }).pipe(Effect.forkChild)
          const outgoing = { data: new Uint8Array([1]), peer: peer.address }
          const empty = { data: new Uint8Array(), peer: peer.address }
          const received = yield* Stream.make(outgoing, empty, outgoing).pipe(
            Stream.concat(Stream.fromEffect(Deferred.succeed(upstreamDone, undefined)).pipe(Stream.drain)),
            Stream.pipeThroughChannel(Datagram.toChannel(socket)),
            Stream.take(1),
            Stream.runCollect
          )
          assert.deepStrictEqual(Array.from(received[0].data), [42])
          assert.deepStrictEqual(received[0].peer, peer.address)
          assert.deepStrictEqual((yield* Fiber.join(exchange)).map((packet) => Array.from(packet.data)), [[1], [], [1]])
        }))

      it.effect("propagates upstream failures and leaves the socket usable", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback })
          const fail = yield* Deferred.make<void>()
          const receiving = yield* Stream.fromEffect(
            Deferred.await(fail).pipe(Effect.andThen(Effect.fail("upstream failure")))
          ).pipe(
            Stream.pipeThroughChannel(Datagram.toChannelWith<string>()(socket)),
            Stream.runDrain,
            Effect.exit,
            Effect.forkChild({ startImmediately: true })
          )
          yield* Deferred.succeed(fail, undefined)
          assert.deepStrictEqual(yield* Fiber.join(receiving), Exit.fail("upstream failure"))
          yield* socket.write({ data: new Uint8Array([1]), peer: socket.address })
          assert.deepStrictEqual(Array.from((yield* socket.pull)[0].data), [1])
        }))

      it.effect("sends the valid channel prefix before a size error and stops before the suffix", () =>
        Effect.gen(function*() {
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const socket = yield* Datagram.bind({ localAddress: loopback, maxPacketBytes: 1 })
          const error = yield* Stream.make(
            { data: new Uint8Array([1]), peer: peer.address },
            { data: new Uint8Array([2, 2]), peer: peer.address },
            { data: new Uint8Array([3]), peer: peer.address }
          ).pipe(
            Stream.pipeThroughChannel(Datagram.toChannel(socket)),
            Stream.runDrain,
            Effect.flip
          )
          assert.deepStrictEqual(
            error.reason,
            new Datagram.DatagramSocketMessageTooLargeError({ size: 2, maxPacketBytes: 1 })
          )
          yield* socket.write({ data: new Uint8Array([4]), peer: peer.address })
          const received = yield* Datagram.toStream(peer).pipe(Stream.take(2), Stream.runCollect)
          assert.deepStrictEqual(received.map((packet) => Array.from(packet.data)), [[1], [4]])
        }))

      it.effect("interrupts upstream when downstream stops and leaves its reader usable", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback })
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const started = yield* Deferred.make<void>()
          const interrupted = yield* Deferred.make<void>()
          const upstream = Stream.fromEffect(
            Effect.andThen(Deferred.succeed(started, undefined), Effect.never).pipe(
              Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
            )
          )
          const receiving = yield* upstream.pipe(
            Stream.pipeThroughChannel(Datagram.toChannel(socket)),
            Stream.take(1),
            Stream.runCollect,
            Effect.forkChild
          )
          yield* Deferred.await(started)
          yield* peer.write({ data: new Uint8Array([9]), peer: socket.address })
          assert.deepStrictEqual(Array.from((yield* Fiber.join(receiving))[0].data), [9])
          yield* Deferred.await(interrupted)
          yield* peer.write({ data: new Uint8Array([10]), peer: socket.address })
          assert.deepStrictEqual(Array.from((yield* socket.pull)[0].data), [10])
        }))

      it.effect("shares packets between readers without losing them to an interrupted pull", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback, readBatchSize: 1 })
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const first = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
          const cancelled = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
          const second = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
          yield* Fiber.interrupt(cancelled)
          yield* peer.write({ data: new Uint8Array([1]), peer: socket.address })
          yield* peer.write({ data: new Uint8Array([2]), peer: socket.address })
          const packets = [...(yield* Fiber.join(first)), ...(yield* Fiber.join(second))]
          assert.deepStrictEqual(packets.map((packet) => packet.data[0]).sort(), [1, 2])
        }))

      it.effect("rejects oversized writes before sending and allows subsequent writes", () =>
        Effect.gen(function*() {
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const socket = yield* Datagram.bind({ localAddress: loopback, maxPacketBytes: 1 })
          const error = yield* socket.write({ data: new Uint8Array([1, 2]), peer: peer.address }).pipe(
            Effect.flip
          )
          assert.deepStrictEqual(
            error.reason,
            new Datagram.DatagramSocketMessageTooLargeError({ size: 2, maxPacketBytes: 1 })
          )
          yield* socket.write({ data: new Uint8Array([3]), peer: peer.address })
          assert.deepStrictEqual(Array.from((yield* peer.pull)[0].data), [3])
        }))

      it.effect("copies the current payload on each execution of a lazy write", () =>
        Effect.gen(function*() {
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const socket = yield* Datagram.bind({ localAddress: loopback })
          const data = new Uint8Array([1])
          const write = socket.write({ data, peer: peer.address })
          data[0] = 2
          yield* write
          data[0] = 3
          yield* write
          data[0] = 4
          const received = yield* Datagram.toStream(peer).pipe(Stream.take(2), Stream.runCollect)
          assert.deepStrictEqual(received.map((packet) => Array.from(packet.data)), [[2], [3]])
          for (const packet of received) assert.deepStrictEqual(packet.peer, socket.address)
        }))

      it.effect("rejects unspecified and zero-port peers", () =>
        Effect.gen(function*() {
          for (
            const remote of [
              NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 0),
              NetAddress.inetAddressFromIpStringUnsafe("0.0.0.0", 12345),
              NetAddress.inetAddressFromIpStringUnsafe("::", 12345),
              NetAddress.inetAddressFromIpStringUnsafe("::ffff:0.0.0.0", 12345)
            ]
          ) {
            const error = yield* Datagram.connect({ localAddress: loopback, remote }).pipe(Effect.flip)
            assert.strictEqual(error.reason._tag, "DatagramSocketInvalidOptionsError")
          }
        }))
    })
  })
}
