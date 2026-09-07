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
    expect(NetAddress.socketAddressFromInput("127.0.0.1:3000")).type.toBe<
      Result.Result<NetAddress.SocketAddress, NetAddress.NetAddressError>
    >()
    expect(NetAddress.socketAddressFromInputUnsafe({ path: "server.sock" })).type.toBe<NetAddress.SocketAddress>()
    expect(NetAddress.ipv4FromBytesUnsafe(new Uint8Array(4))).type.toBe<NetAddress.Ipv4Address>()
    expect(NetAddress.ipv6FromBytesUnsafe(new Uint8Array(16))).type.toBe<NetAddress.Ipv6Address>()
    expect(NetAddress.ipv4FromOctets([127, 0, 0, 1])).type.toBe<
      Result.Result<NetAddress.Ipv4Address, NetAddress.NetAddressError>
    >()
    expect(NetAddress.ipv6FromSegments([0, 0, 0, 0, 0, 0, 0, 1])).type.toBe<
      Result.Result<NetAddress.Ipv6Address, NetAddress.NetAddressError>
    >()
    expect(NetAddress.macAddressFromOctets([0, 0, 0, 0, 0, 0])).type.toBe<
      Result.Result<NetAddress.MacAddress, NetAddress.NetAddressError>
    >()
    // @ts-expect-error Source has 3 element(s) but target requires 4.
    NetAddress.ipv4FromOctets([127, 0, 1])
    expect(NetAddress.ipv6ToOctets(NetAddress.ipv6Loopback)).type.toBe<ReadonlyArray<number>>()
    // @ts-expect-error Property 'bytes' does not exist
    void NetAddress.ipv4Loopback.bytes
  })

  it("requires canonical socket addresses at consumer constructors", () => {
    const server = HttpServer.make({
      address: NetAddress.inetAddressUnsafe(NetAddress.ipv4Loopback, 8080),
      serve: () => Effect.void
    })
    expect(server.address).type.toBe<NetAddress.SocketAddress>()

    HttpServer.make({
      // @ts-expect-error Type 'string' is not assignable to type 'Ipv6Address'
      address: { address: "localhost", port: 8080 },
      serve: () => Effect.void
    })
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

  it("preserves named codec types when rebuilding schemas", () => {
    expect(Schema.MacAddressFromString).type.toBe<Schema.MacAddressFromString>()
    expect(Schema.MacAddressFromString.annotate({ title: "Address" })).type.toBe<Schema.MacAddressFromString>()
    expect(Schema.Ipv4AddressFromString).type.toBe<Schema.Ipv4AddressFromString>()
    expect(Schema.Ipv4AddressFromString.annotate({ title: "Address" })).type.toBe<Schema.Ipv4AddressFromString>()
    expect(Schema.Ipv6AddressFromString).type.toBe<Schema.Ipv6AddressFromString>()
    expect(Schema.Ipv6AddressFromString.annotate({ title: "Address" })).type.toBe<Schema.Ipv6AddressFromString>()
    expect(Schema.IpAddressFromString).type.toBe<Schema.IpAddressFromString>()
    expect(Schema.IpAddressFromString.annotate({ title: "Address" })).type.toBe<Schema.IpAddressFromString>()
    expect(Schema.Ipv4InterfaceFromString).type.toBe<Schema.Ipv4InterfaceFromString>()
    expect(Schema.Ipv4InterfaceFromString.annotate({ title: "Address" })).type.toBe<Schema.Ipv4InterfaceFromString>()
    expect(Schema.Ipv6InterfaceFromString).type.toBe<Schema.Ipv6InterfaceFromString>()
    expect(Schema.Ipv6InterfaceFromString.annotate({ title: "Address" })).type.toBe<Schema.Ipv6InterfaceFromString>()
    expect(Schema.IpInterfaceFromString).type.toBe<Schema.IpInterfaceFromString>()
    expect(Schema.IpInterfaceFromString.annotate({ title: "Address" })).type.toBe<Schema.IpInterfaceFromString>()
    expect(Schema.Ipv4NetworkFromString).type.toBe<Schema.Ipv4NetworkFromString>()
    expect(Schema.Ipv4NetworkFromString.annotate({ title: "Address" })).type.toBe<Schema.Ipv4NetworkFromString>()
    expect(Schema.Ipv6NetworkFromString).type.toBe<Schema.Ipv6NetworkFromString>()
    expect(Schema.Ipv6NetworkFromString.annotate({ title: "Address" })).type.toBe<Schema.Ipv6NetworkFromString>()
    expect(Schema.IpNetworkFromString).type.toBe<Schema.IpNetworkFromString>()
    expect(Schema.IpNetworkFromString.annotate({ title: "Address" })).type.toBe<Schema.IpNetworkFromString>()
    expect(Schema.InetAddressFromString).type.toBe<Schema.InetAddressFromString>()
    expect(Schema.InetAddressFromString.annotate({ title: "Address" })).type.toBe<Schema.InetAddressFromString>()
    expect(Schema.UnixPathAddressFromString).type.toBe<Schema.UnixPathAddressFromString>()
    expect(Schema.UnixPathAddressFromString.annotate({ title: "Address" })).type.toBe<
      Schema.UnixPathAddressFromString
    >()
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
