import * as DenoDatagramSocket from "@effect/platform-deno/DenoDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as NetAddress from "effect/net/NetAddress"
import type * as DatagramSocket from "effect/socket/DatagramSocket"

const host = "127.0.0.1"
const address = (host: string, port: number) => NetAddress.inetAddressFromIpStringUnsafe(host, port)
const text = (payload: Uint8Array) => new TextDecoder().decode(payload)
const bounded = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.scoped, Effect.timeout("3 seconds"))
const take = (reader: DatagramSocket.Reader, count: number) =>
  Effect.gen(function*() {
    const packets: Array<DatagramSocket.Datagram> = []
    while (packets.length < count) packets.push(...(yield* reader.pull))
    return packets
  })

const assertError = (error: DatagramSocket.DatagramSocketError, tag: string) => {
  assert.strictEqual(error.reason._tag, tag)
  return error.reason
}

describe("DenoDatagramSocket", () => {
  it.effect("binds port zero and reports the bound address", () =>
    bounded(Effect.gen(function*() {
      const socket = DenoDatagramSocket.make({ bind: { address: host, port: 0 } })
      const reader = yield* socket.reader
      assert.strictEqual(reader.address.port > 0, true)
      assert.deepStrictEqual(reader.address.address, address(host, 0).address)
      assert.strictEqual(reader.address, reader.address)
    })))

  it.effect("round trips IPv4 and replies through the received datagram", () =>
    bounded(Effect.gen(function*() {
      const server = DenoDatagramSocket.make({ bind: { address: host } })
      const client = DenoDatagramSocket.make({ bind: { address: host } })
      const incoming = yield* server.reader
      const sender = yield* client.reader
      const serverWriter = yield* server.writer
      const clientWriter = yield* client.writer
      yield* clientWriter.writeAll([
        { payload: "ping-1", address: incoming.address },
        { payload: "ping-2", address: incoming.address },
        { payload: "ping-3", address: incoming.address }
      ])
      const requests = yield* take(incoming, 3)
      assert.deepStrictEqual(requests.map((packet) => text(packet.payload)), ["ping-1", "ping-2", "ping-3"])
      for (const request of requests) yield* serverWriter.write({ payload: "pong", address: request })
      const replies = yield* take(sender, 3)
      assert.deepStrictEqual(replies.map((packet) => text(packet.payload)), ["pong", "pong", "pong"])
      assert.strictEqual(replies[0].address.port, incoming.address.port)
    })))

  it.effect("sends every datagram in writeAll", () =>
    bounded(Effect.gen(function*() {
      const socket = DenoDatagramSocket.make({ bind: { address: host } })
      const reader = yield* socket.reader
      const writer = yield* socket.writer
      yield* writer.writeAll([
        { payload: "one", address: reader.address },
        { payload: new TextEncoder().encode("two"), address: reader.address },
        { payload: "three", address: reader.address }
      ])
      const packets = yield* take(reader, 3)
      assert.deepStrictEqual(packets.map((packet) => text(packet.payload)), ["one", "two", "three"])
    })))

  it.effect("uses the peer as the default destination", () =>
    bounded(Effect.gen(function*() {
      const receiver = DenoDatagramSocket.make({ bind: { address: host } })
      const incoming = yield* receiver.reader
      const socket = DenoDatagramSocket.make({ peer: incoming.address })
      yield* socket.reader
      const writer = yield* socket.writer
      yield* writer.writeAll([{ payload: "peer-1" }, { payload: "peer-2" }])
      assert.deepStrictEqual((yield* take(incoming, 2)).map((packet) => text(packet.payload)), ["peer-1", "peer-2"])
    })))

  it.effect("resolves a hostname peer once per reader acquisition", () =>
    bounded(Effect.gen(function*() {
      const receiver = DenoDatagramSocket.make({ bind: { address: host } })
      const incoming = yield* receiver.reader
      const original = Deno.resolveDns
      let calls = 0
      // Resolution must happen at open, never once per write.
      const descriptor = Object.getOwnPropertyDescriptor(Deno, "resolveDns")!
      Object.defineProperty(Deno, "resolveDns", {
        ...descriptor,
        value: (...args: Parameters<typeof Deno.resolveDns>) => {
          calls++
          return original(...args)
        }
      })
      try {
        const socket = DenoDatagramSocket.make({
          peer: { address: "localhost", port: incoming.address.port },
          family: "ipv4"
        })
        yield* Effect.gen(function*() {
          yield* socket.reader
          const writer = yield* socket.writer
          yield* writer.writeAll([{ payload: "first" }, { payload: "second" }])
          assert.deepStrictEqual((yield* take(incoming, 2)).map((packet) => text(packet.payload)), ["first", "second"])
        }).pipe(Effect.scoped)
        assert.strictEqual(calls, 1)
      } finally {
        Object.defineProperty(Deno, "resolveDns", descriptor)
      }
    })))

  it.effect("maps an occupied port to an open error", () =>
    bounded(Effect.gen(function*() {
      const first = DenoDatagramSocket.make({ bind: { address: host } })
      const reader = yield* first.reader
      const second = DenoDatagramSocket.make({ bind: { address: host, port: reader.address.port } })
      const error = yield* second.reader.pipe(Effect.scoped, Effect.flip)
      assertError(error, "DatagramSocketOpenError")
      assert.strictEqual(error.reason._tag === "DatagramSocketOpenError" && error.reason.kind, "AddressInUse")
    })))

  it.effect("maps an oversized native send to a write error", () =>
    bounded(Effect.gen(function*() {
      const socket = DenoDatagramSocket.make({ bind: { address: host } })
      const reader = yield* socket.reader
      const writer = yield* socket.writer
      const error = yield* writer.write({ payload: new Uint8Array(65508), address: reader.address }).pipe(Effect.flip)
      assertError(error, "DatagramSocketWriteError")
      assert.strictEqual(error.reason._tag === "DatagramSocketWriteError" && error.reason.kind, "MessageTooLarge")
    })))

  it.effect("round trips IPv6 on ::1", () =>
    bounded(Effect.gen(function*() {
      const socket = DenoDatagramSocket.make({ family: "ipv6", bind: { address: "::1" } })
      const reader = yield* socket.reader
      const writer = yield* socket.writer
      yield* writer.writeAll([{ payload: "ipv6-1", address: reader.address }, {
        payload: "ipv6-2",
        address: reader.address
      }])
      assert.deepStrictEqual((yield* take(reader, 2)).map((packet) => text(packet.payload)), ["ipv6-1", "ipv6-2"])
      assert.deepStrictEqual(reader.address.address, address("::1", 0).address)
    })))

  it.effect("joins and leaves multicast and rejects a unicast group", () =>
    bounded(Effect.gen(function*() {
      const socket = DenoDatagramSocket.make({ reuseAddress: true })
      const reader = yield* socket.reader
      const group = NetAddress.ipFromStringUnsafe("239.255.0.1")
      if (!NetAddress.isMulticast(group)) throw new Error("expected multicast group")
      yield* reader.joinMulticast({ group }).pipe(Effect.scoped)
      const invalid = NetAddress.ipFromStringUnsafe(host) as NetAddress.MulticastAddress<NetAddress.IpAddress>
      const error = yield* reader.joinMulticast({ group: invalid }).pipe(Effect.scoped, Effect.flip)
      assertError(error, "DatagramSocketOpenError")
    })))

  it.effect("rejects source-specific multicast", () =>
    bounded(Effect.gen(function*() {
      const reader = yield* DenoDatagramSocket.make().reader
      const group = NetAddress.ipFromStringUnsafe("239.255.0.1")
      if (!NetAddress.isMulticast(group)) throw new Error("expected multicast group")
      const error = yield* reader.joinMulticast({ group, source: NetAddress.ipFromStringUnsafe(host) }).pipe(
        Effect.scoped,
        Effect.flip
      )
      assertError(error, "DatagramSocketUnsupportedError")
    })))
})
