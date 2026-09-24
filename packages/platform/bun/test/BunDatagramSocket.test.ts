import * as BunDatagramSocket from "@effect/platform-bun/BunDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as NetAddress from "effect/net/NetAddress"
import * as Scope from "effect/Scope"
import * as DatagramSocket from "effect/socket/DatagramSocket"

const host = "127.0.0.1"
const text = (packet: DatagramSocket.Datagram) => new TextDecoder().decode(packet.payload)
const endpoint = (port: number, address = host) => ({ address, port })
const bounded = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.timeout("5 seconds"))

// pull can return batches, so collect by packet count rather than pull count.
const collect = (reader: DatagramSocket.Reader, count: number) =>
  Effect.gen(function*() {
    const packets: Array<DatagramSocket.Datagram> = []
    while (packets.length < count) packets.push(...(yield* reader.pull))
    assert.strictEqual(packets.length, count)
    return packets
  })

const assertReason = (error: DatagramSocket.DatagramSocketError, tag: string) => {
  assert.instanceOf(error, DatagramSocket.DatagramSocketError)
  assert.strictEqual(error.reason._tag, tag)
}

describe("BunDatagramSocket", () => {
  it.effect("binds port zero and reports the actual address", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const reader = yield* (yield* BunDatagramSocket.make({ bind: { address: host, port: 0 } })).reader
      assert.isAbove(reader.address.port, 0)
      assert.deepStrictEqual(reader.address, NetAddress.inetAddressFromIpStringUnsafe(host, reader.address.port))
    }))))

  it.effect("round trips IPv4 and replies using the received datagram", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const server = yield* BunDatagramSocket.make({ bind: { address: host } })
      const client = yield* BunDatagramSocket.make({ bind: { address: host } })
      const serverReader = yield* server.reader
      const clientReader = yield* client.reader
      const serverWriter = yield* server.writer
      const clientWriter = yield* client.writer
      for (const payload of ["one", "two", "three"]) {
        yield* clientWriter.write({ payload, address: serverReader.address })
      }
      const received = yield* collect(serverReader, 3)
      assert.deepStrictEqual(received.map(text), ["one", "two", "three"])
      for (const packet of received) yield* serverWriter.write({ payload: packet.payload, address: packet })
      assert.deepStrictEqual((yield* collect(clientReader, 3)).map(text), ["one", "two", "three"])
    }))))

  it.effect("sends a batch with writeAll", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const server = yield* BunDatagramSocket.make({ bind: { address: host } })
      const client = yield* BunDatagramSocket.make({ bind: { address: host } })
      const reader = yield* server.reader
      yield* client.reader
      const writer = yield* client.writer
      yield* writer.writeAll([
        { payload: "a", address: reader.address },
        { payload: "b", address: reader.address },
        { payload: "c", address: reader.address }
      ])
      assert.deepStrictEqual((yield* collect(reader, 3)).map(text), ["a", "b", "c"])
    }))))

  for (const address of [host, "localhost"]) {
    it.effect(`peer resolves ${address} once and supplies the default destination`, () =>
      bounded(Effect.scoped(Effect.gen(function*() {
        const server = yield* BunDatagramSocket.make({ bind: { address: host } })
        const reader = yield* server.reader
        const client = yield* BunDatagramSocket.make({ peer: endpoint(reader.address.port, address), family: "ipv4" })
        yield* client.reader
        const writer = yield* client.writer
        yield* writer.writeAll([{ payload: "one" }, { payload: "two" }])
        assert.deepStrictEqual((yield* collect(reader, 2)).map(text), ["one", "two"])
      }))))
  }

  it.effect("connects at creation and sends without a destination", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const server = yield* BunDatagramSocket.make({ bind: { address: host } })
      const reader = yield* server.reader
      const client = yield* BunDatagramSocket.make({ connect: endpoint(reader.address.port) })
      yield* client.reader
      const writer = yield* client.writer
      yield* writer.writeAll([{ payload: "connected-1" }, { payload: "connected-2" }])
      assert.deepStrictEqual((yield* collect(reader, 2)).map(text), ["connected-1", "connected-2"])
    }))))

  it.effect("maps EADDRINUSE to an open error", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const first = yield* BunDatagramSocket.make({ bind: { address: host } })
      const reader = yield* first.reader
      const second = yield* BunDatagramSocket.make({ bind: endpoint(reader.address.port) })
      const error = yield* Effect.flip(second.reader)
      assertReason(error, "DatagramSocketOpenError")
      if (error.reason._tag === "DatagramSocketOpenError") assert.strictEqual(error.reason.kind, "AddressInUse")
    }))))

  it.effect("maps an oversized send to a write error", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const socket = yield* BunDatagramSocket.make({ bind: { address: host } })
      const reader = yield* socket.reader
      const writer = yield* socket.writer
      const error = yield* Effect.flip(writer.write({ payload: new Uint8Array(65536), address: reader.address }))
      assertReason(error, "DatagramSocketWriteError")
    }))))

  it.effect("round trips IPv6 on ::1", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const server = yield* BunDatagramSocket.make({ family: "ipv6", bind: { address: "::1" } })
      const client = yield* BunDatagramSocket.make({ family: "ipv6", bind: { address: "::1" } })
      const reader = yield* server.reader
      yield* client.reader
      const writer = yield* client.writer
      yield* writer.writeAll([{ payload: "v6-1", address: reader.address }, {
        payload: "v6-2",
        address: reader.address
      }])
      assert.deepStrictEqual((yield* collect(reader, 2)).map(text), ["v6-1", "v6-2"])
    }))))

  it.effect("joins and leaves multicast and rejects a unicast group", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const socket = yield* BunDatagramSocket.make({ bind: { address: "0.0.0.0" }, reuseAddress: true })
      const reader = yield* socket.reader
      const group = NetAddress.ipFromStringUnsafe("239.255.42.42")
      assert.isTrue(NetAddress.isMulticast(group))
      if (!NetAddress.isMulticast(group)) return
      const membership = yield* Scope.make()
      yield* reader.joinMulticast({ group }).pipe(Scope.provide(membership))
      yield* Scope.close(membership, Exit.void)
      const unicast = NetAddress.ipFromStringUnsafe(host) as NetAddress.MulticastAddress<NetAddress.Ipv4Address>
      const error = yield* Effect.flip(reader.joinMulticast({ group: unicast }))
      assert.instanceOf(error, DatagramSocket.DatagramSocketError)
    }))))

  it.effect("stops draining when the socket closes and completes queued writes once", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      let handlers: Bun.udp.SocketHandler<"buffer"> | undefined
      let sends = 0
      let completions = 0
      let closed = false
      const native = {
        address: { address: host, port: 12345, family: "IPv4" },
        get closed() {
          return closed
        },
        reload: (options: { socket: Bun.udp.SocketHandler<"buffer"> }) => {
          handlers = options.socket
        },
        send: () => {
          sends++
          return false
        },
        sendMany: () => {
          sends++
          closed = true
          throw new Error("Socket is closed")
        },
        close: () => {
          closed = true
        }
      } as unknown as BunDatagramSocket.UdpSocket
      const socket = yield* BunDatagramSocket.fromUdpSocket(Effect.succeed(native))
      yield* socket.reader
      const writer = yield* socket.writer
      const destination = NetAddress.inetAddressFromIpStringUnsafe(host, 12346)
      const writes = ["one", "two", "three", "four"].map((payload) =>
        Effect.runFork(
          Effect.flip(writer.write({ payload, address: destination })).pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                completions++
              })
            )
          )
        )
      )
      assert.strictEqual(sends, 1)
      assert.isFunction(handlers?.drain)
      handlers!.drain!(native)
      for (const write of writes) {
        assertReason(yield* Fiber.join(write), "DatagramSocketClosedError")
      }
      assert.strictEqual(sends, 2, "drain must not retry entries already failed by closure")
      assert.strictEqual(completions, writes.length)
    }))))

  it.effect("reports ICMP errors through onError", () =>
    bounded(Effect.scoped(Effect.gen(function*() {
      const reported = yield* Deferred.make<DatagramSocket.DatagramSocketError>()
      const probe = yield* BunDatagramSocket.make({ bind: { address: host } })
      const probeScope = yield* Scope.make()
      const probeReader = yield* probe.reader.pipe(Scope.provide(probeScope))
      const port = probeReader.address.port
      yield* Scope.close(probeScope, Exit.void)
      const client = yield* BunDatagramSocket.make({
        connect: endpoint(port),
        onError: (error) => {
          Effect.runSync(Deferred.succeed(reported, error))
        }
      })
      yield* client.reader
      const writer = yield* client.writer
      yield* writer.write({ payload: "probe" })
      assertReason(yield* Deferred.await(reported), "DatagramSocketReadError")
    }))))
})
