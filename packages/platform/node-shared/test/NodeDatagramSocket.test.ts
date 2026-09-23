import * as NodeDatagramSocket from "@effect/platform-node-shared/NodeDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as NetAddress from "effect/net/NetAddress"
import * as Result from "effect/Result"
import * as DatagramSocket from "effect/socket/DatagramSocket"
import * as Dgram from "node:dgram"
import type * as Dns from "node:dns"
import { vi } from "vitest"

// Keep the call record outside vi.fn: Vitest clears mock histories when
// concurrent tests start, including while this test is awaiting datagrams.
const lookupCalls = vi.hoisted(() => [] as Array<string>)

// The adapter resolves hostnames itself with `node:dns` `lookup`
vi.mock("node:dns", async (importOriginal) => {
  const original = await importOriginal<typeof Dns>()
  const lookup = vi.fn(original.lookup)
  lookup.mockImplementation((...args) => {
    lookupCalls.push(args[0])
    Reflect.apply(original.lookup, original, args)
  })
  return { ...original, lookup, default: { ...original, lookup } }
})

const loopback = { address: "127.0.0.1", port: 0 }
const decoder = new TextDecoder()
const text = (datagrams: ReadonlyArray<DatagramSocket.Datagram>) =>
  datagrams.map((datagram) => decoder.decode(datagram.payload))

const open = (options?: NodeDatagramSocket.Options) =>
  Effect.gen(function*() {
    const socket = yield* NodeDatagramSocket.make(options)
    const reader = yield* socket.reader
    const writer = yield* socket.writer
    return { reader, writer }
  })

// Pulls until `count` datagrams arrived. A lost packet fails the timeout
// instead of hanging the test.
const pullN = (reader: DatagramSocket.Reader, count: number) =>
  Effect.gen(function*() {
    const received: Array<DatagramSocket.Datagram> = []
    while (received.length < count) received.push(...(yield* reader.pull))
    return received
  }).pipe(Effect.timeout("2 seconds"))

const reasonOf = <Tag extends DatagramSocket.DatagramSocketErrorReason["_tag"]>(
  error: DatagramSocket.DatagramSocketError,
  tag: Tag
) => {
  assert.strictEqual(error.reason._tag, tag)
  return error.reason as Extract<DatagramSocket.DatagramSocketErrorReason, { readonly _tag: Tag }>
}

// Binds a raw socket to find a free port, then releases it
const freePort = Effect.callback<number>((resume) => {
  const socket = Dgram.createSocket("udp4")
  socket.bind(0, "127.0.0.1", () => {
    const { port } = socket.address()
    socket.close(() => resume(Effect.succeed(port)))
  })
})

const multicastGroup = (address: NetAddress.Ipv4Address) => {
  if (!NetAddress.isMulticast(address)) throw new Error(`${NetAddress.formatIp(address)} is not multicast`)
  return address
}

describe("NodeDatagramSocket", () => {
  it.live("binds port 0 and reports the bound address", () =>
    Effect.gen(function*() {
      const { reader } = yield* open({ bind: loopback })
      assert.isTrue(NetAddress.isInetAddressV4(reader.address))
      assert.strictEqual(NetAddress.formatHost(reader.address), "127.0.0.1")
      assert.isAbove(reader.address.port, 0)

      const defaults = yield* open()
      assert.strictEqual(NetAddress.formatHost(defaults.reader.address), "0.0.0.0")
      assert.isAbove(defaults.reader.address.port, 0)
    }), 5_000)

  it.live("layer provides the service", () =>
    Effect.gen(function*() {
      const socket = yield* DatagramSocket.DatagramSocket
      const reader = yield* socket.reader
      assert.strictEqual(NetAddress.formatHost(reader.address), "127.0.0.1")
    }).pipe(Effect.provide(NodeDatagramSocket.layer({ bind: loopback }))), 5_000)

  it.live("IPv4 round trip, replying through the received datagram", () =>
    Effect.gen(function*() {
      const server = yield* open({ bind: loopback })
      const client = yield* open({ bind: loopback })
      for (const payload of ["a", "b", "c"]) {
        yield* client.writer.write({ payload, address: server.reader.address })
      }
      const received = yield* pullN(server.reader, 3)
      assert.deepStrictEqual(text(received), ["a", "b", "c"])
      assert.strictEqual(NetAddress.formatInet(received[0].address), NetAddress.formatInet(client.reader.address))

      for (const datagram of received) {
        yield* server.writer.write({ payload: datagram.payload, address: datagram })
      }
      const replies = yield* pullN(client.reader, 3)
      assert.deepStrictEqual(text(replies), ["a", "b", "c"])
      assert.strictEqual(NetAddress.formatInet(replies[0].address), NetAddress.formatInet(server.reader.address))
    }), 5_000)

  it.live("writeAll sends every datagram", () =>
    Effect.gen(function*() {
      const server = yield* open({ bind: loopback })
      const client = yield* open({ bind: loopback })
      const address = server.reader.address
      yield* client.writer.writeAll([
        { payload: "a", address },
        { payload: new TextEncoder().encode("b"), address },
        { payload: "c", address },
        { payload: "d", address }
      ])
      const received = yield* pullN(server.reader, 4)
      assert.deepStrictEqual(text(received).sort(), ["a", "b", "c", "d"])

      const [first, ...rest] = received
      yield* server.writer.writeAll([
        { payload: first.payload, address: first },
        ...rest.map((datagram) => ({ payload: datagram.payload, address: datagram }))
      ])
      const replies = yield* pullN(client.reader, 4)
      assert.deepStrictEqual(text(replies).sort(), ["a", "b", "c", "d"])
    }), 5_000)

  it.live("peer is the default destination", () =>
    Effect.gen(function*() {
      const server = yield* open({ bind: loopback })
      const fromAddress = yield* open({ bind: loopback, peer: server.reader.address })
      const fromLiteral = yield* open({
        bind: loopback,
        peer: { address: "127.0.0.1", port: server.reader.address.port }
      })
      yield* fromAddress.writer.write({ payload: "a" })
      yield* fromAddress.writer.write({ payload: "b" })
      yield* fromLiteral.writer.write({ payload: "c" })
      const received = yield* pullN(server.reader, 3)
      assert.deepStrictEqual(text(received).sort(), ["a", "b", "c"])
    }), 5_000)

  it.live("resolves a hostname peer once per reader", () =>
    Effect.gen(function*() {
      const lookups = () => lookupCalls.filter((hostname) => hostname === "localhost").length
      const before = lookups()
      const server = yield* open({ bind: loopback })
      const client = yield* open({ peer: { address: "localhost", port: server.reader.address.port } })
      for (const payload of ["a", "b", "c"]) {
        yield* client.writer.write({ payload })
      }
      const received = yield* pullN(server.reader, 3)
      assert.deepStrictEqual(text(received), ["a", "b", "c"])
      assert.strictEqual(lookups() - before, 1)
    }), 5_000)

  it.live("connect is applied after bind", () =>
    Effect.gen(function*() {
      const server = yield* open({ bind: loopback })
      const port = yield* freePort
      const client = yield* open({
        bind: { address: "127.0.0.1", port },
        connect: server.reader.address
      })
      assert.strictEqual(client.reader.address.port, port)
      yield* client.writer.write({ payload: "a" })
      yield* client.writer.write({ payload: "b" })
      const received = yield* pullN(server.reader, 2)
      assert.deepStrictEqual(text(received), ["a", "b"])
      assert.strictEqual(received[0].address.port, port)

      // the connected socket still receives from its peer
      yield* server.writer.write({ payload: "c", address: received[0] })
      const replies = yield* pullN(client.reader, 1)
      assert.deepStrictEqual(text(replies), ["c"])
    }), 5_000)

  it.live("IPv6 round trip on ::1", () =>
    Effect.gen(function*() {
      const server = yield* open({ bind: { address: "::1", port: 0 } })
      const client = yield* open({ bind: { address: "::1", port: 0 } })
      assert.isTrue(NetAddress.isInetAddressV6(server.reader.address))
      assert.strictEqual(NetAddress.formatHost(server.reader.address), "::1")

      for (const payload of ["a", "b", "c"]) {
        yield* client.writer.write({ payload, address: server.reader.address })
      }
      const received = yield* pullN(server.reader, 3)
      assert.deepStrictEqual(text(received), ["a", "b", "c"])
      assert.strictEqual(NetAddress.formatInet(received[0].address), NetAddress.formatInet(client.reader.address))

      for (const datagram of received) {
        yield* server.writer.write({ payload: datagram.payload, address: datagram })
      }
      const replies = yield* pullN(client.reader, 3)
      assert.deepStrictEqual(text(replies), ["a", "b", "c"])
    }), 5_000)

  it.live("EADDRINUSE fails reader acquisition with DatagramSocketOpenError", () =>
    Effect.gen(function*() {
      const first = yield* open({ bind: loopback })
      const second = yield* NodeDatagramSocket.make({
        bind: { address: "127.0.0.1", port: first.reader.address.port }
      })
      const error = yield* Effect.flip(second.reader)
      assert.strictEqual(reasonOf(error, "DatagramSocketOpenError").kind, "AddressInUse")
    }), 5_000)

  it.live("a send error fails the write with DatagramSocketWriteError", () =>
    Effect.gen(function*() {
      const server = yield* open({ bind: loopback })
      const client = yield* open({ bind: loopback })
      const address = server.reader.address
      const tooLarge = new Uint8Array(70_000)

      const error = yield* Effect.flip(client.writer.write({ payload: tooLarge, address }))
      const reason = reasonOf(error, "DatagramSocketWriteError")
      assert.strictEqual(reason.kind, "MessageTooLarge")
      assert.strictEqual(reason.address && NetAddress.formatInet(reason.address), NetAddress.formatInet(address))

      const batchError = yield* Effect.flip(client.writer.writeAll([
        { payload: "a", address },
        { payload: tooLarge, address }
      ]))
      const batchReason = reasonOf(batchError, "DatagramSocketWriteError")
      assert.strictEqual(batchReason.kind, "MessageTooLarge")
      assert.strictEqual(
        batchReason.address && NetAddress.formatInet(batchReason.address),
        NetAddress.formatInet(address)
      )

      // a send error is not terminal
      yield* client.writer.write({ payload: "b", address })
      const received = yield* pullN(server.reader, 2)
      assert.deepStrictEqual(text(received), ["a", "b"])
    }), 5_000)

  it.live("reports ICMP errors on a connected socket to onError", () =>
    Effect.gen(function*() {
      const closedPort = yield* Effect.scoped(Effect.map(open({ bind: loopback }), ({ reader }) => reader.address.port))
      const reported = yield* Deferred.make<DatagramSocket.DatagramSocketError>()
      const client = yield* open({
        bind: loopback,
        connect: { address: "127.0.0.1", port: closedPort },
        onError: (error) => Deferred.doneUnsafe(reported, Effect.succeed(error))
      })
      // the kernel reports the ICMP error on whichever syscall comes next, so
      // keep sending until one surfaces through `onError`
      yield* client.writer.write({ payload: "ping" }).pipe(
        Effect.ignore,
        Effect.andThen(Effect.sleep("20 millis")),
        Effect.forever,
        Effect.forkScoped
      )
      const error = yield* Deferred.await(reported).pipe(Effect.timeout("2 seconds"))
      assert.strictEqual(reasonOf(error, "DatagramSocketReadError").kind, "ConnectionRefused")
    }), 5_000)

  it.live("joins and leaves a multicast group", () =>
    Effect.gen(function*() {
      const { reader } = yield* open({ bind: { address: "0.0.0.0", port: 0 } })
      const group = multicastGroup(Result.getOrThrow(NetAddress.ipv4FromOctets([239, 255, 83, 1])))
      yield* Effect.scoped(reader.joinMulticast({ group, interface: NetAddress.ipv4Loopback }))
      // joining twice without leaving fails, so this proves the first join left
      yield* Effect.scoped(reader.joinMulticast({ group, interface: NetAddress.ipv4Loopback }))
    }), 5_000)

  it.live("fails to join a unicast group", () =>
    Effect.gen(function*() {
      const { reader } = yield* open({ bind: { address: "0.0.0.0", port: 0 } })
      const unicast = NetAddress.ipv4Loopback as NetAddress.MulticastAddress<NetAddress.Ipv4Address>
      const error = yield* Effect.flip(Effect.scoped(reader.joinMulticast({ group: unicast })))
      assert.instanceOf(error, DatagramSocket.DatagramSocketError)
    }), 5_000)

  it.live("fromSocket adopts a bound socket and closes it with the reader", () =>
    Effect.gen(function*() {
      const server = yield* open({ bind: loopback })
      const adopted: Array<Dgram.Socket> = []
      const closed = yield* Deferred.make<void>()
      const socket = yield* NodeDatagramSocket.fromSocket(
        Effect.callback<Dgram.Socket>((resume) => {
          const native = Dgram.createSocket("udp4")
          native.once("close", () => Deferred.doneUnsafe(closed, Effect.void))
          adopted.push(native)
          native.bind(0, "127.0.0.1", () => resume(Effect.succeed(native)))
        }),
        { peer: server.reader.address }
      )
      yield* Effect.scoped(Effect.gen(function*() {
        const reader = yield* socket.reader
        const writer = yield* socket.writer
        assert.strictEqual(reader.address.port, adopted[0].address().port)
        yield* writer.write({ payload: "a" })
        const received = yield* pullN(server.reader, 1)
        assert.deepStrictEqual(text(received), ["a"])
        assert.strictEqual(received[0].address.port, reader.address.port)
      }))
      yield* Deferred.await(closed).pipe(Effect.timeout("2 seconds"))
    }), 5_000)
})
