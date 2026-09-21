import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Result, Scope, Stream } from "effect"
import type * as Layer from "effect/Layer"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Os from "node:os"

const loopback = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 0)
const ipv4MulticastFixture = (input: string): NetAddress.MulticastAddress<NetAddress.Ipv4Address> => {
  const address = NetAddress.ipFromStringUnsafe(input)
  if (!NetAddress.isIpv4Address(address) || !NetAddress.isMulticast(address)) {
    throw new Error("expected IPv4 multicast test address")
  }
  return address
}
const ipv6MulticastFixture = (input: string): NetAddress.MulticastAddress<NetAddress.Ipv6Address> => {
  const address = NetAddress.ipFromStringUnsafe(input)
  if (!NetAddress.isIpv6Address(address) || !NetAddress.isMulticast(address)) {
    throw new Error("expected IPv6 multicast test address")
  }
  return address
}
const ipv4LoopbackInterface =
  Object.entries(Os.networkInterfaces()).find(([, addresses]) =>
      addresses?.some((address) => address.family === "IPv4" && address.address === "127.0.0.1")
    ) === undefined ?
    undefined :
    NetAddress.ipv4Loopback
const ipv6ScopedInterface =
  Object.entries(Os.networkInterfaces()).flatMap(([name, addresses]) =>
    addresses?.flatMap((address) =>
      address.family === "IPv6" && address.scopeid > 0
        ? [{ address: address.address, name, index: address.scopeid }]
        : []
    ) ?? []
  )[0]
const isDeno = "Deno" in globalThis
const isBun = "Bun" in globalThis

const assertScopedPeer = (
  peer: NetAddress.InetAddress,
  bound: NetAddress.InetAddress,
  scopeId: number
) => {
  assert.strictEqual(peer._tag, "InetAddressV6")
  assert.strictEqual(bound._tag, "InetAddressV6")
  if (peer._tag !== "InetAddressV6" || bound._tag !== "InetAddressV6") return
  assert.strictEqual(peer.port, bound.port)
  assert.deepStrictEqual(peer.address, bound.address)
  assert.strictEqual(peer.scopeId, scopeId)
  assert.strictEqual(bound.scopeId, 0)
}

export const suite = (name: string, layer: Layer.Layer<Datagram.DatagramSocketFactory>) => {
  describe(name, () => {
    it.layer(layer)((it) => {
      it.effect("toggles broadcast while retaining the socket and a pending receive", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback, broadcast: true })
          const receiving = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
          yield* socket.setBroadcast(false)
          yield* socket.setBroadcast(true)
          yield* socket.write({ data: new Uint8Array([1]), peer: socket.address })
          assert.deepStrictEqual(Array.from((yield* Fiber.join(receiving))[0].data), [1])
        }))

      it.effect.skipIf(ipv4LoopbackInterface === undefined)(
        "selects the outgoing IPv4 multicast interface",
        () =>
          Effect.gen(function*() {
            const socket = yield* Datagram.bind({ localAddress: loopback })
            yield* socket.setMulticastInterface(ipv4LoopbackInterface!)
            yield* socket.setMulticastInterface(NetAddress.ipv4Unspecified)
          })
      )

      it.effect("joins, leaves, and rejoins multicast without replacing the socket", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback })
          const group = ipv4MulticastFixture("239.255.0.1")
          const options = { interface: ipv4LoopbackInterface } as const
          yield* socket.addMembership(group, options)
          yield* socket.dropMembership(group, options)
          const failure = yield* Effect.flip(socket.dropMembership(group, options))
          assert.strictEqual(failure.reason._tag, "DatagramSocketConfigurationError")
          assert.instanceOf(failure.cause, Error)
          yield* socket.addMembership(group, options)
          yield* socket.write({ data: new Uint8Array([2]), peer: socket.address })
          assert.deepStrictEqual(Array.from((yield* socket.pull)[0].data), [2])
        }))

      it.effect.skipIf(ipv6ScopedInterface === undefined)(
        "joins and leaves IPv6 multicast on a native interface index",
        () =>
          Effect.gen(function*() {
            const socket = yield* Datagram.bind({
              localAddress: NetAddress.inetAddressFromIpStringUnsafe("::1", 0)
            })
            const group = ipv6MulticastFixture("ff02::1")
            yield* socket.addMembership(group, { interface: ipv6ScopedInterface!.index })
            yield* socket.dropMembership(group, { interface: ipv6ScopedInterface!.index })
          })
      )

      it.effect.skipIf(ipv6ScopedInterface === undefined)(
        "selects a scoped IPv6 multicast interface by native index",
        () =>
          Effect.gen(function*() {
            const socket = yield* Datagram.bind({
              localAddress: NetAddress.inetAddressFromIpStringUnsafe("::", 0)
            })
            const group = ipv6MulticastFixture("ff02::1")
            const options = { interface: ipv6ScopedInterface!.index } as const
            yield* socket.addMembership(group, options)
            yield* socket.dropMembership(group, options)
            yield* socket.setMulticastInterface(ipv6ScopedInterface!.index)
            yield* socket.setMulticastInterface(0)
          })
      )

      it.effect.skipIf(ipv6ScopedInterface === undefined)(
        "round-trips scoped IPv6 addresses through bind, connect, and unassociated sends",
        () =>
          Effect.gen(function*() {
            const scopedAddress = Result.getOrThrow(NetAddress.inetAddressFromHostString(
              `${ipv6ScopedInterface!.address}%${ipv6ScopedInterface!.name}`,
              0,
              new Map([[ipv6ScopedInterface!.name, ipv6ScopedInterface!.index]])
            ))
            const receiver = yield* Datagram.bind({ localAddress: scopedAddress })
            assert.strictEqual(receiver.address._tag, "InetAddressV6")
            if (receiver.address._tag !== "InetAddressV6") return
            assert.strictEqual(receiver.address.scopeId, isDeno || isBun ? 0 : ipv6ScopedInterface!.index)

            const associated = yield* Datagram.connect({
              localAddress: scopedAddress,
              remote: receiver.address
            })
            yield* associated.write(new Uint8Array([1]))
            const [associatedPacket] = yield* receiver.pull
            assert.deepStrictEqual(Array.from(associatedPacket.data), [1])
            if (isBun) assertScopedPeer(associatedPacket.peer, associated.address, ipv6ScopedInterface!.index)
            else assert.deepStrictEqual(associatedPacket.peer, associated.address)

            const unassociated = yield* Datagram.bind({ localAddress: scopedAddress })
            yield* unassociated.write({ data: new Uint8Array([2]), peer: receiver.address })
            const [packet] = yield* receiver.pull
            assert.deepStrictEqual(Array.from(packet.data), [2])
            if (isBun) assertScopedPeer(packet.peer, unassociated.address, ipv6ScopedInterface!.index)
            else assert.deepStrictEqual(packet.peer, unassociated.address)

            yield* receiver.write({ data: new Uint8Array([3]), peer: packet.peer })
            const [reply] = yield* unassociated.pull
            assert.deepStrictEqual(Array.from(reply.data), [3])
            if (isBun) assertScopedPeer(reply.peer, receiver.address, ipv6ScopedInterface!.index)
            else assert.deepStrictEqual(reply.peer, receiver.address)
          }).pipe(Effect.timeout("5 seconds"))
      )

      it.effect.skipIf(ipv4LoopbackInterface === undefined)(
        "uses an IPv4 interface address for membership operations",
        () =>
          Effect.gen(function*() {
            const socket = yield* Datagram.bind({ localAddress: loopback })
            const group = ipv4MulticastFixture("239.255.0.2")
            const options = { interface: ipv4LoopbackInterface! } as const
            yield* socket.addMembership(group, options)
            yield* socket.dropMembership(group, options)
          })
      )

      it.effect("rejects an unresolved positive IPv6 interface index for joins and leaves", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({
            localAddress: NetAddress.inetAddressFromIpStringUnsafe("::1", 0)
          })
          const group = ipv6MulticastFixture("ff02::115")
          for (const operation of [socket.addMembership, socket.dropMembership]) {
            const failure = yield* operation(group, { interface: 0xffff_ffff }).pipe(Effect.flip)
            assert.strictEqual(failure.reason._tag, "DatagramSocketConfigurationError")
            assert.instanceOf(failure.cause, Error)
          }
        }))

      it.effect.skipIf(ipv4LoopbackInterface === undefined)(
        "uses source-specific membership and preserves native missing-membership failures",
        () =>
          Effect.gen(function*() {
            const socket = yield* Datagram.bind({ localAddress: loopback })
            const group = ipv4MulticastFixture("232.0.0.1")
            const options = { interface: ipv4LoopbackInterface!, source: NetAddress.ipv4Loopback } as const
            yield* socket.addMembership(group, options)
            yield* socket.dropMembership(group, options)
            const failure = yield* socket.dropMembership(group, options).pipe(Effect.flip)
            assert.strictEqual(failure.reason._tag, "DatagramSocketConfigurationError")
            assert.instanceOf(failure.cause, Error)
          })
      )

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
            for (const packet of packets) {
              assert.deepStrictEqual(packet.peer, sender.address)
              assert.strictEqual(packet.data.byteLength, packet.data.buffer.byteLength)
            }
          }))

        it.effect(`connects to a peer and filters other senders over ${host}`, () =>
          Effect.gen(function*() {
            const localAddress = NetAddress.inetAddressFromIpStringUnsafe(host, 0)
            const peer = yield* Datagram.bind({ localAddress })
            const stranger = yield* Datagram.bind({ localAddress })
            const client = yield* Datagram.connect({ localAddress, remote: peer.address })
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

      it.effect("sends batches to different destinations and associated peers", () =>
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
          const associated = yield* Datagram.connect({ localAddress: loopback, remote: first.address })
          yield* associated.writeMany([new Uint8Array(), new Uint8Array([3])])
          assert.deepStrictEqual(
            (yield* Datagram.toStream(first).pipe(Stream.take(2), Stream.runCollect)).map((p) => Array.from(p.data)),
            [[], [3]]
          )
        }))

      it.effect("pre-validates an entire cross-family batch before sending", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({
            localAddress: NetAddress.inetAddressFromIpStringUnsafe("::1", 0)
          })
          const failure = yield* socket.writeMany([
            { data: new Uint8Array([1]), peer: socket.address },
            { data: new Uint8Array([2]), peer: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 9) },
            { data: new Uint8Array([3]), peer: socket.address }
          ]).pipe(Effect.flip)
          assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
          yield* socket.write({ data: new Uint8Array([4]), peer: socket.address })
          assert.deepStrictEqual((yield* socket.pull).map((packet) => Array.from(packet.data)), [[4]])
        }))

      it.effect("enforces ipv6Only while preserving IPv6 traffic", () =>
        Effect.gen(function*() {
          const receiver = yield* Datagram.bind({
            localAddress: NetAddress.inetAddressFromIpStringUnsafe("::", 0),
            ipv6Only: true,
            readBatchSize: 1
          })
          const receiving = yield* receiver.pull.pipe(Effect.forkChild({ startImmediately: true }))
          const ipv4 = yield* Datagram.bind({ localAddress: loopback })
          yield* ipv4.write({
            data: new Uint8Array([4]),
            peer: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", receiver.address.port)
          })
          yield* Effect.yieldNow
          const ipv6 = yield* Datagram.bind({
            localAddress: NetAddress.inetAddressFromIpStringUnsafe("::1", 0)
          })
          yield* ipv6.write({
            data: new Uint8Array([6]),
            peer: NetAddress.inetAddressFromIpStringUnsafe("::1", receiver.address.port)
          })
          assert.deepStrictEqual(Array.from((yield* Fiber.join(receiving).pipe(Effect.timeout("2 seconds")))[0].data), [
            6
          ])
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
          const error = yield* Datagram.bind({ localAddress: socket.address, reuseAddress: false }).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
          assert.instanceOf(error.cause, Error)
          yield* socket.write({ data: new Uint8Array([1]), peer: socket.address })
          assert.deepStrictEqual(Array.from((yield* socket.pull)[0].data), [1])
        }))

      it.effect(
        "rejects cross-family association before native acquisition",
        () =>
          Effect.gen(function*() {
            const failure = yield* Datagram.connect({
              localAddress: NetAddress.inetAddressFromIpStringUnsafe("::1", 0),
              remote: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 9)
            }).pipe(Effect.flip)
            assert.strictEqual(failure.reason._tag, "DatagramSocketInvalidOptionsError")
          })
      )

      it.effect("shares a UDP port only when address reuse is enabled", () =>
        Effect.gen(function*() {
          const first = yield* Datagram.bind({ localAddress: loopback, reuseAddress: true })
          const second = yield* Datagram.bind({ localAddress: first.address, reuseAddress: true })
          assert.deepStrictEqual(second.address, first.address)
        }))

      it.effect("inherits address reuse when acquiring an associated socket", () =>
        Effect.gen(function*() {
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const first = yield* Datagram.connect({
            localAddress: loopback,
            remote: peer.address,
            reuseAddress: true
          })
          const second = yield* Datagram.connect({
            localAddress: first.address,
            remote: peer.address,
            reuseAddress: true
          })
          assert.deepStrictEqual(second.address, first.address)
        }))

      it.effect("leaves the endpoint open after interrupting a receive", () =>
        Effect.gen(function*() {
          const socket = yield* Datagram.bind({ localAddress: loopback })
          const receiving = yield* socket.pull.pipe(Effect.forkChild({ startImmediately: true }))
          yield* Fiber.interrupt(receiving)
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

      it.effect("rejects an oversized channel group without undoing earlier groups", () =>
        Effect.gen(function*() {
          const peer = yield* Datagram.bind({ localAddress: loopback })
          const socket = yield* Datagram.bind({ localAddress: loopback, maxPacketBytes: 1 })
          const first = Stream.make({ data: new Uint8Array([1]), peer: peer.address })
          const rejected = Stream.make(
            { data: new Uint8Array([2]), peer: peer.address },
            { data: new Uint8Array([3, 3]), peer: peer.address },
            { data: new Uint8Array([4]), peer: peer.address }
          )
          const error = yield* first.pipe(
            Stream.concat(rejected),
            Stream.pipeThroughChannel(Datagram.toChannel(socket)),
            Stream.runDrain,
            Effect.flip
          )
          assert.deepStrictEqual(
            error.reason,
            new Datagram.DatagramSocketMessageTooLargeError({ size: 2, maxPacketBytes: 1 })
          )
          yield* socket.write({ data: new Uint8Array([5]), peer: peer.address })
          const received = yield* Datagram.toStream(peer).pipe(Stream.take(2), Stream.runCollect)
          assert.deepStrictEqual(received.map((packet) => Array.from(packet.data)), [[1], [5]])
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
