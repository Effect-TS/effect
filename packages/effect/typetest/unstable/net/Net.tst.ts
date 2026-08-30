import { type Result, Schema } from "effect"
import * as Net from "effect/unstable/net/Net"
import { describe, expect, it } from "tstyche"

describe("Net", () => {
  it("exposes checked and throwing constructors", () => {
    expect(Net.macAddressFromString("00:00:5e:00:53:01")).type.toBe<
      Result.Result<Net.MacAddress, Net.AddressError>
    >()
    expect(Net.macAddressFromStringUnsafe("00:00:5e:00:53:01")).type.toBe<Net.MacAddress>()
    expect(Net.ipFromString("::1")).type.toBe<Result.Result<Net.IpAddress, Net.AddressError>>()
    expect(Net.ipFromStringUnsafe("::1")).type.toBe<Net.IpAddress>()
    expect(Net.inetAddressUnsafe(Net.ipv6Loopback, 80)).type.toBe<Net.InetAddress>()
    expect(Net.inetAddressFromStringUnsafe("[::1]:80")).type.toBe<Net.InetAddress>()
  })

  it("narrows address unions", () => {
    const address = null as unknown as Net.SocketAddress
    if (Net.isUnixPathAddress(address)) {
      expect(address).type.toBe<Net.UnixPathAddress>()
    } else if (Net.isInetAddressV4(address)) {
      expect(address.address).type.toBe<Net.Ipv4Address>()
    } else {
      expect(address.address).type.toBe<Net.Ipv6Address>()
    }
  })

  it("exposes string transformation schemas", () => {
    expect(Schema.MacAddressFromString).type.toBeAssignableTo<Schema.Codec<Net.MacAddress, string>>()
    expect(Schema.IpAddressFromString).type.toBeAssignableTo<Schema.Codec<Net.IpAddress, string>>()
    expect(Schema.InetAddressFromString).type.toBeAssignableTo<Schema.Codec<Net.InetAddress, string>>()
    expect(Schema.UnixPathAddressFromString).type.toBeAssignableTo<Schema.Codec<Net.UnixPathAddress, string>>()
  })
})
