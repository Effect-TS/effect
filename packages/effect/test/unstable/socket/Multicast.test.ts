import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Ref, Result, Scope } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Multicast from "effect/unstable/socket/Multicast"

const localAddress = NetAddress.inetAddressFromIpStringUnsafe("0.0.0.0", 12345)
const localV6 = NetAddress.inetAddressFromIpStringUnsafe("::", 12345)
const group = Result.getOrThrow(NetAddress.ipv4FromString("239.255.23.42"))
const groupV6 = Result.getOrThrow(NetAddress.ipv6FromString("ff02::114"))
const networkInterface: Multicast.Ipv4Interface = { _tag: "Ipv4", address: NetAddress.ipv4Loopback }
const interfaceV6: Multicast.Ipv6Interface = { _tag: "Ipv6", index: 1 }

const capture = Effect.fnUntraced(function*(options: Multicast.BindOptions) {
  const observed = yield* Deferred.make<Multicast.ResolvedBindOptions>()
  const socket = yield* Multicast.fromTransport(
    options,
    (resolved, handlers) =>
      Deferred.succeed(observed, resolved).pipe(Effect.as({
        address: resolved.localAddress,
        send: (packet: Datagram.OutgoingPacket) =>
          Effect.sync(() => handlers.onMessage(packet.data, resolved.localAddress))
      }))
  )
  return { socket, options: yield* Deferred.await(observed) }
})

describe("Multicast", () => {
  it.effect("applies multicast defaults and preserves datagram buffering and I/O", () =>
    Effect.gen(function*() {
      const { options, socket } = yield* capture({ localAddress, receiveCapacity: 1, maxPacketBytes: 2 })
      assert.deepStrictEqual(options, {
        localAddress,
        receiveCapacity: 1,
        maxPacketBytes: 2,
        memberships: [],
        hopLimit: 1,
        loopback: true,
        reuseAddress: false
      })
      assert.isTrue(Datagram.isDatagramSocket(socket))
      const destination = NetAddress.inetAddressUnsafe(group, localAddress.port)
      yield* socket.writer.write({ data: new Uint8Array([1]), destination })
      yield* socket.writer.write({ data: new Uint8Array([2]), destination })
      assert.deepStrictEqual(Array.from((yield* socket.reader.pull)[0].data), [1])
      const failure = yield* Effect.flip(socket.writer.write({ data: new Uint8Array([1, 2, 3]), destination }))
      assert.strictEqual(failure.reason._tag, "DatagramSocketMessageTooLargeError")
    }))

  it.effect("deduplicates equal memberships without merging distinct interfaces", () =>
    Effect.gen(function*() {
      const memberships: Array<Multicast.Membership> = [
        { group },
        { group, interface: networkInterface },
        { group: Result.getOrThrow(NetAddress.ipv4FromString("239.255.23.42")) },
        { group, interface: { _tag: "Ipv4", address: Result.getOrThrow(NetAddress.ipv4FromString("127.0.0.1")) } }
      ]
      const { options } = yield* capture({
        localAddress,
        memberships,
        outgoingInterface: networkInterface,
        hopLimit: 0,
        loopback: false,
        reuseAddress: true
      })
      assert.deepStrictEqual(options.memberships, memberships.slice(0, 2))
      assert.strictEqual(memberships.length, 4)
      assert.deepStrictEqual(options.outgoingInterface, networkInterface)
      assert.strictEqual(options.hopLimit, 0)
      assert.strictEqual(options.loopback, false)
      assert.strictEqual(options.reuseAddress, true)
    }))

  it.effect("accepts IPv6 groups with explicit interface indices and the maximum hop limit", () =>
    Effect.gen(function*() {
      const { options } = yield* capture({
        localAddress: localV6,
        memberships: [{ group: groupV6, interface: interfaceV6 }],
        outgoingInterface: interfaceV6,
        hopLimit: 255
      })
      assert.deepStrictEqual(options.memberships, [{ group: groupV6, interface: interfaceV6 }])
      assert.strictEqual(options.hopLimit, 255)
    }))

  const invalid: Array<readonly [string, Multicast.BindOptions]> = [
    ...[-1, 256, 0.5, NaN, Infinity].map((hopLimit) => [`hopLimit ${hopLimit}`, { localAddress, hopLimit }] as const),
    ["unicast group", { localAddress, memberships: [{ group: NetAddress.ipv4Loopback }] }],
    ["IPv6 group on IPv4 socket", { localAddress, memberships: [{ group: groupV6, interface: interfaceV6 }] }],
    ["IPv4 group on IPv6 socket", { localAddress: localV6, memberships: [{ group }] }],
    ["outgoing interface family", { localAddress, outgoingInterface: interfaceV6 }],
    ["IPv6 outgoing interface family", { localAddress: localV6, outgoingInterface: networkInterface }],
    ["missing IPv6 interface", {
      localAddress: localV6,
      memberships: [{ group: groupV6 } as Multicast.Membership]
    }],
    ["membership interface family", {
      localAddress,
      memberships: [{ group, interface: interfaceV6 } as unknown as Multicast.Membership]
    }],
    ...[-1, 0, 0.5, 0x100000000, NaN].map((index) =>
      [
        `interface index ${index}`,
        { localAddress: localV6, memberships: [{ group: groupV6, interface: { _tag: "Ipv6", index } }] }
      ] as const
    ),
    ...["0.0.0.0", "224.0.0.1", "255.255.255.255"].map((address) =>
      [
        `interface address ${address}`,
        {
          localAddress,
          outgoingInterface: { _tag: "Ipv4", address: Result.getOrThrow(NetAddress.ipv4FromString(address)) }
        }
      ] as const
    )
  ]

  it.effect.each(invalid.map(([name, options]) => ({ name, options })))(
    "rejects $name before native acquisition",
    ({ options }) =>
      Effect.gen(function*() {
        const error = yield* Multicast.fromTransport(options, () => Effect.die("Unexpected native acquisition")).pipe(
          Effect.flip
        )
        assert.strictEqual(error.reason._tag, "DatagramSocketInvalidOptionsError")
      })
  )

  it.effect("releases partially configured transports before returning their failure", () =>
    Effect.gen(function*() {
      const released = yield* Ref.make(false)
      const failure = new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketOpenError({ cause: "join failed" })
      })
      const error = yield* Multicast.fromTransport({ localAddress, memberships: [{ group }] }, () =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() =>
            Ref.set(released, true)
          )
          return yield* failure
        })).pipe(Effect.flip)
      assert.strictEqual(error, failure)
      assert.isTrue(yield* Ref.get(released))
    }))

  it.effect("closes partial acquisition when interrupted", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const released = yield* Ref.make(false)
      const fiber = yield* Multicast.fromTransport({ localAddress }, () =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() => Ref.set(released, true))
          yield* Deferred.succeed(started, undefined)
          return yield* Effect.never
        })).pipe(Effect.forkChild)
      yield* Deferred.await(started)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(yield* Ref.get(released))
    }))

  it.effect("uses the multicast factory and keeps I/O owned by the acquisition scope", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.fork(yield* Effect.scope)
      const socket = yield* Multicast.bind({ localAddress }).pipe(
        Effect.provideService(Multicast.MulticastFactory, {
          bind: (options) => Effect.map(capture(options), ({ socket }) => socket)
        }),
        Scope.provide(scope)
      )
      const receiving = yield* socket.reader.pull.pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Fiber.join(receiving)).reason._tag, "DatagramSocketClosedError")
      const failure = yield* socket.writer.write({ data: new Uint8Array(), destination: localAddress }).pipe(
        Effect.flip
      )
      assert.strictEqual(failure.reason._tag, "DatagramSocketClosedError")
    }))
})
