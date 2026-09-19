import { type Channel, Effect, type Scope, type Stream } from "effect"
import type { NetAddress } from "effect/unstable/net"
import { DatagramSocket as Datagram } from "effect/unstable/socket"
import { describe, expect, it } from "tstyche"

const address = null as unknown as NetAddress.InetAddress
const data = new Uint8Array()
const packet: Datagram.Packet = { data, peer: address }

describe("DatagramSocket", () => {
  it("uses byte packets with a peer in both directions", () => {
    expect<Datagram.Packet>().type.toBe<{
      readonly data: Uint8Array
      readonly peer: NetAddress.InetAddress
    }>()
    expect({ data: "hello", peer: address }).type.not.toBeAssignableTo<Datagram.Packet>()
    const options: Datagram.MakeUnconnectedOptions = {
      address,
      pull: Effect.succeed([packet]),
      write: (packet) => {
        expect(packet).type.toBe<Datagram.Packet>()
        return Effect.void
      }
    }
    const socket = Datagram.makeUnconnected(options)
    expect(socket).type.toBe<Datagram.UnconnectedSocket>()
    expect(socket._tag).type.toBe<"UnconnectedSocket">()
    expect(socket.writeMany([packet])).type.toBe<Effect.Effect<void, Datagram.DatagramSocketError>>()
  })

  it("constructs connected sockets with payload-only writes", () => {
    const options: Datagram.MakeConnectedOptions = {
      address,
      remote: address,
      pull: Effect.succeed([packet]),
      write: (payload) => {
        expect(payload).type.toBe<Uint8Array>()
        return Effect.void
      },
      writeMany: (payloads) => {
        expect(payloads).type.toBe<ReadonlyArray<Uint8Array>>()
        return Effect.void
      }
    }
    const socket = Datagram.makeConnected(options)
    expect(socket).type.toBe<Datagram.ConnectedSocket>()
    expect(socket.write).type.toBeCallableWith(data)
    expect(socket.write).type.not.toBeCallableWith(packet)
    expect(Datagram.makeConnected).type.not.toBeCallableWith({
      address,
      pull: Effect.never,
      write: (_: Uint8Array) => Effect.void
    })
    expect(Datagram.makeConnected).type.not.toBeCallableWith({
      ...options,
      write: (_: Datagram.Packet) => Effect.void
    })
    expect(Datagram.makeUnconnected).type.not.toBeCallableWith(options)
  })

  it("uses the same packet shape for transport submissions", () => {
    const binding: Datagram.Binding = {
      address,
      send: (packet) => {
        expect(packet).type.toBe<Datagram.Packet>()
        return Effect.void
      },
      sendMany: (packets) => {
        expect(packets).type.toBe<ReadonlyArray<Datagram.Packet>>()
        return Effect.void
      }
    }
    expect(Datagram.fromTransport({ localAddress: address }, () => Effect.succeed(binding))).type.toBe<
      Effect.Effect<Datagram.UnconnectedSocket, Datagram.DatagramSocketError, Scope.Scope>
    >()
  })

  it("narrows socket variants to their distinct write inputs", () => {
    const socket = null as unknown as Datagram.DatagramSocket
    if (socket._tag === "ConnectedSocket") {
      expect(socket).type.toBe<Datagram.ConnectedSocket>()
      expect(socket.remote).type.toBe<NetAddress.InetAddress>()
      expect(socket.write).type.toBeCallableWith(data)
      expect(socket.write).type.not.toBeCallableWith(data, address)
      expect(socket.write).type.not.toBeCallableWith(packet)
      expect(socket.writeMany).type.toBeCallableWith([data])
      expect(socket.writeMany).type.not.toBeCallableWith([packet])
      expect(Datagram.toChannel(socket)).type.toBe<
        Channel.Channel<
          readonly [Datagram.Packet, ...Array<Datagram.Packet>],
          Datagram.DatagramSocketError,
          void,
          readonly [Uint8Array, ...Array<Uint8Array>],
          never
        >
      >()
      expect(Datagram.toChannelWith<string>()(socket)).type.toBe<
        Channel.Channel<
          readonly [Datagram.Packet, ...Array<Datagram.Packet>],
          Datagram.DatagramSocketError | string,
          void,
          readonly [Uint8Array, ...Array<Uint8Array>],
          string
        >
      >()
    } else {
      expect(socket).type.toBe<Datagram.UnconnectedSocket>()
      expect(socket.write).type.toBeCallableWith(packet)
      expect(socket.write).type.not.toBeCallableWith(data)
      expect(socket.write).type.not.toBeCallableWith(data, address)
      expect(socket.writeMany).type.toBeCallableWith([packet])
      expect(socket.writeMany).type.not.toBeCallableWith([data])
      expect(Datagram.toChannelWith<string>()(socket)).type.toBe<
        Channel.Channel<
          readonly [Datagram.Packet, ...Array<Datagram.Packet>],
          Datagram.DatagramSocketError | string,
          void,
          readonly [Datagram.Packet, ...Array<Datagram.Packet>],
          string
        >
      >()
    }
    expect(Datagram.toStream(socket)).type.toBe<Stream.Stream<Datagram.Packet, Datagram.DatagramSocketError>>()
    expect<Datagram.ConnectedSocket>().type.not.toBeAssignableTo<Datagram.UnconnectedSocket>()
    expect<Datagram.UnconnectedSocket>().type.not.toBeAssignableTo<Datagram.ConnectedSocket>()
  })

  it("narrows unknown sockets before choosing the write signature", () => {
    const socket = null as unknown
    if (Datagram.isDatagramSocket(socket)) {
      expect(socket).type.toBe<Datagram.DatagramSocket>()
      if (socket._tag === "ConnectedSocket") {
        expect(socket.write).type.toBeCallableWith(data)
      } else {
        expect(socket.write).type.toBeCallableWith(packet)
      }
    }
  })

  it("returns concrete variants from acquisition", () => {
    expect(Datagram.bind({ localAddress: address })).type.toBe<
      Effect.Effect<
        Datagram.UnconnectedSocket,
        Datagram.DatagramSocketError,
        Datagram.DatagramSocketFactory | Scope.Scope
      >
    >()
    expect(Datagram.connect({ localAddress: address, remote: address })).type.toBe<
      Effect.Effect<
        Datagram.ConnectedSocket,
        Datagram.DatagramSocketError,
        Datagram.DatagramSocketFactory | Scope.Scope
      >
    >()
    expect(Datagram.fromConnectedTransport(
      { localAddress: address, remote: address },
      () => Effect.succeed({ address, send: () => Effect.void })
    )).type.toBe<Effect.Effect<Datagram.ConnectedSocket, Datagram.DatagramSocketError, Scope.Scope>>()
  })
})
