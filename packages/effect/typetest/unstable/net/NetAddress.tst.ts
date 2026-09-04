import { Effect, type Result, Schema } from "effect"
import * as HttpServer from "effect/unstable/http/HttpServer"
import * as NetAddress from "effect/unstable/net/NetAddress"
import { describe, expect, it } from "tstyche"

describe("NetAddress", () => {
  it("exposes checked and throwing constructors", () => {
    expect(NetAddress.macAddressFromString("00:00:5e:00:53:01")).type.toBe<
      Result.Result<NetAddress.MacAddress, NetAddress.NetAddressError>
    >()
    expect(NetAddress.macAddressFromStringUnsafe("00:00:5e:00:53:01")).type.toBe<NetAddress.MacAddress>()
    expect(NetAddress.ipFromString("::1")).type.toBe<Result.Result<NetAddress.IpAddress, NetAddress.NetAddressError>>()
    expect(NetAddress.ipFromStringUnsafe("::1")).type.toBe<NetAddress.IpAddress>()
    expect(NetAddress.inetAddressUnsafe(NetAddress.ipv6Loopback, 80)).type.toBe<NetAddress.InetAddress>()
    expect(NetAddress.inetAddressFromStringUnsafe("[::1]:80")).type.toBe<NetAddress.InetAddress>()
    expect(NetAddress.socketAddressFromInput({ address: "::1", port: 80 })).type.toBe<
      Result.Result<NetAddress.SocketAddress, NetAddress.NetAddressError>
    >()
    expect(NetAddress.socketAddressFromInputUnsafe({ path: "server.sock" })).type.toBe<NetAddress.SocketAddress>()
    expect(NetAddress.ipv4FromBytesUnsafe(new Uint8Array(4))).type.toBe<NetAddress.Ipv4Address>()
    expect(NetAddress.ipv6FromBytesUnsafe(new Uint8Array(16))).type.toBe<NetAddress.Ipv6Address>()
    expect(NetAddress.ipv6ToOctets(NetAddress.ipv6Loopback)).type.toBe<ReadonlyArray<number>>()
    expect(NetAddress.ipv4Loopback.bytes).type.toBe<Uint8Array>()
  })

  it("normalizes socket address input at consumer constructors", () => {
    const server = HttpServer.make({
      address: { address: "127.0.0.1", port: 8080 },
      serve: () => Effect.void
    })
    expect(server.address).type.toBe<NetAddress.SocketAddress>()
  })

  it("narrows address unions", () => {
    const address = null as unknown as NetAddress.SocketAddress
    if (NetAddress.isUnixPathAddress(address)) {
      expect(address).type.toBe<NetAddress.UnixPathAddress>()
    } else if (NetAddress.isInetAddressV4(address)) {
      expect(address.address).type.toBe<NetAddress.Ipv4Address>()
    } else {
      expect(address.address).type.toBe<NetAddress.Ipv6Address>()
    }
  })

  it("exposes string transformation schemas", () => {
    expect(Schema.MacAddressFromString).type.toBeAssignableTo<Schema.Codec<NetAddress.MacAddress, string>>()
    expect(Schema.IpAddressFromString).type.toBeAssignableTo<Schema.Codec<NetAddress.IpAddress, string>>()
    expect(Schema.InetAddressFromString).type.toBeAssignableTo<Schema.Codec<NetAddress.InetAddress, string>>()
    expect(Schema.UnixPathAddressFromString).type.toBeAssignableTo<
      Schema.Codec<NetAddress.UnixPathAddress, string>
    >()
  })
})
