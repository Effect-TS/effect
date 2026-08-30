import { type Result, Schema } from "effect"
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
    expect(NetAddress.ipv4Loopback.bytes).type.toBe<Uint8Array>()
    expect(NetAddress.hostnameFromString("example.com")).type.toBe<
      Result.Result<NetAddress.Hostname, NetAddress.HostError>
    >()
    expect(NetAddress.hostFromString("example.com")).type.toBe<Result.Result<NetAddress.Host, NetAddress.HostError>>()
    expect(NetAddress.authorityFromString("example.com:80")).type.toBe<
      Result.Result<NetAddress.Authority, NetAddress.HostError>
    >()
    expect(NetAddress.inetAddressFromAuthority(NetAddress.authorityFromStringUnsafe("127.0.0.1:80"))).type.toBe<
      Result.Result<NetAddress.InetAddress, NetAddress.HostError>
    >()
  })

  it("narrows host unions", () => {
    const host = null as unknown as NetAddress.Host
    if (NetAddress.isHostname(host)) {
      expect(host).type.toBe<NetAddress.Hostname>()
    } else if (NetAddress.isIpv4Address(host)) {
      expect(host).type.toBe<NetAddress.Ipv4Address>()
    } else {
      expect(host).type.toBe<NetAddress.Ipv6Address>()
    }
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
    expect(Schema.Hostname).type.toBeAssignableTo<Schema.Codec<NetAddress.Hostname, NetAddress.Hostname>>()
    expect(Schema.HostnameFromString).type.toBeAssignableTo<Schema.Codec<NetAddress.Hostname, string>>()
    expect(Schema.HostFromString).type.toBeAssignableTo<Schema.Codec<NetAddress.Host, string>>()
    expect(Schema.AuthorityFromString).type.toBeAssignableTo<Schema.Codec<NetAddress.Authority, string>>()
  })
})
