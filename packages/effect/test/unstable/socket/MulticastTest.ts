import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Result, Scope, Stream } from "effect"
import type * as Layer from "effect/Layer"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Multicast from "effect/unstable/socket/Multicast"

const localAddress = NetAddress.inetAddressFromIpStringUnsafe("0.0.0.0", 0)
const group = Result.getOrThrow(NetAddress.ipv4FromString("239.255.23.42"))
const secondGroup = Result.getOrThrow(NetAddress.ipv4FromString("239.255.23.43"))
const networkInterface: Multicast.Ipv4Interface = { _tag: "Ipv4", address: NetAddress.ipv4Loopback }
const memberships: ReadonlyArray<Multicast.Membership> = [{ group, interface: networkInterface }]

export const suite = (name: string, layer: Layer.Layer<Multicast.MulticastFactory>) => {
  describe(name, () => {
    it.live("receives multiple groups and preserves empty payloads and sources", () =>
      Effect.gen(function*() {
        const receiver = yield* Multicast.bind({
          localAddress,
          memberships: [...memberships, ...memberships, { group: secondGroup, interface: networkInterface }]
        })
        const sender = yield* Multicast.bind({ localAddress, outgoingInterface: networkInterface })
        for (
          const [address, data] of [
            [group, new Uint8Array([1, 2])],
            [secondGroup, new Uint8Array()],
            [group, new Uint8Array([3])]
          ] as const
        ) {
          yield* sender.writer.write({
            data,
            destination: NetAddress.inetAddressUnsafe(address, receiver.address.port)
          })
        }
        const packets = yield* Datagram.toStream(receiver).pipe(Stream.take(3), Stream.runCollect)
        assert.deepStrictEqual(packets.map((packet) => Array.from(packet.data)), [[1, 2], [], [3]])
        for (const packet of packets) {
          assert.strictEqual(packet.source.port, sender.address.port)
          assert.deepStrictEqual(packet.source.address, NetAddress.ipv4Loopback)
        }
      }).pipe(Effect.provide(layer), Effect.timeout("3 seconds")))

    it.live("delivers each multicast packet to both subscribers sharing a port", () =>
      Effect.gen(function*() {
        const first = yield* Multicast.bind({ localAddress, memberships, reuseAddress: true })
        const second = yield* Multicast.bind({ localAddress: first.address, memberships, reuseAddress: true })
        const sender = yield* Multicast.bind({ localAddress, outgoingInterface: networkInterface })
        yield* sender.writer.write({
          data: new Uint8Array([42]),
          destination: NetAddress.inetAddressUnsafe(group, first.address.port)
        })
        for (const receiver of [first, second]) {
          assert.deepStrictEqual(Array.from((yield* receiver.reader.pull)[0].data), [42])
        }
      }).pipe(Effect.provide(layer), Effect.timeout("3 seconds")))

    it.live("also receives unicast and keeps ordinary datagram adapters usable", () =>
      Effect.gen(function*() {
        const receiver = yield* Multicast.bind({ localAddress, memberships })
        const sender = yield* Multicast.bind({ localAddress, loopback: false })
        yield* sender.writer.write({
          data: new Uint8Array([7]),
          destination: NetAddress.inetAddressUnsafe(NetAddress.ipv4Loopback, receiver.address.port)
        })
        assert.deepStrictEqual(Array.from((yield* receiver.reader.pull)[0].data), [7])
      }).pipe(Effect.provide(layer), Effect.timeout("3 seconds")))

    it.live("closes pending I/O and releases the port and membership with its scope", () =>
      Effect.gen(function*() {
        const scope = yield* Scope.fork(yield* Effect.scope)
        const socket = yield* Multicast.bind({ localAddress, memberships }).pipe(Scope.provide(scope))
        const receiving = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
        yield* Scope.close(scope, Exit.void)
        assert.strictEqual((yield* Fiber.join(receiving)).reason._tag, "DatagramSocketClosedError")
        const error = yield* socket.writer.write({ data: new Uint8Array(), destination: socket.address }).pipe(
          Effect.flip
        )
        assert.strictEqual(error.reason._tag, "DatagramSocketClosedError")
        const rebound = yield* Multicast.bind({ localAddress: socket.address, memberships })
        assert.deepStrictEqual(rebound.address, socket.address)
      }).pipe(Effect.provide(layer), Effect.timeout("3 seconds")))

    it.live("rolls back earlier memberships and the binding when a later join fails", () =>
      Effect.gen(function*() {
        const probe = yield* Effect.scoped(Multicast.bind({ localAddress }))
        const error = yield* Multicast.bind({
          localAddress: probe.address,
          memberships: [
            ...memberships,
            {
              group: secondGroup,
              interface: { _tag: "Ipv4", address: Result.getOrThrow(NetAddress.ipv4FromString("192.0.2.254")) }
            }
          ]
        }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
        const rebound = yield* Multicast.bind({ localAddress: probe.address, memberships })
        assert.deepStrictEqual(rebound.address, probe.address)
      }).pipe(Effect.provide(layer), Effect.timeout("3 seconds")))
  })
}
