import { type Result, Schema } from "effect"
import * as IpNetwork from "effect/unstable/net/IpNetwork"
import * as Net from "effect/unstable/net/Net"
import { describe, expect, it } from "tstyche"

describe("IpNetwork", () => {
  it("preserves address families in checked constructors", () => {
    expect(IpNetwork.make(Net.ipv4Unspecified, 0)).type.toBe<
      Result.Result<IpNetwork.Ipv4Network, IpNetwork.NetworkError>
    >()
    expect(IpNetwork.make(Net.ipv6Unspecified, 0)).type.toBe<
      Result.Result<IpNetwork.Ipv6Network, IpNetwork.NetworkError>
    >()
    expect(IpNetwork.fromAddress(Net.ipv4Unspecified, 0)).type.toBe<
      Result.Result<IpNetwork.Ipv4Network, IpNetwork.NetworkError>
    >()
    const address = null as unknown as Net.IpAddress
    expect(IpNetwork.make(address, 0)).type.toBe<Result.Result<IpNetwork.IpNetwork, IpNetwork.NetworkError>>()
    expect(IpNetwork.fromAddress(address, 0)).type.toBe<Result.Result<IpNetwork.IpNetwork, IpNetwork.NetworkError>>()
  })

  it("exposes checked and throwing parsers", () => {
    expect(IpNetwork.ipv4FromString("0.0.0.0/0")).type.toBe<
      Result.Result<IpNetwork.Ipv4Network, IpNetwork.NetworkError>
    >()
    expect(IpNetwork.ipv6FromString("::/0")).type.toBe<
      Result.Result<IpNetwork.Ipv6Network, IpNetwork.NetworkError>
    >()
    expect(IpNetwork.fromString("::/0")).type.toBe<Result.Result<IpNetwork.IpNetwork, IpNetwork.NetworkError>>()
    expect(IpNetwork.makeUnsafe(Net.ipv4Unspecified, 0)).type.toBe<IpNetwork.Ipv4Network>()
    expect(IpNetwork.fromAddressUnsafe(Net.ipv6Unspecified, 0)).type.toBe<IpNetwork.Ipv6Network>()
    expect(IpNetwork.fromStringUnsafe("::/0")).type.toBe<IpNetwork.IpNetwork>()
  })

  it("narrows network unions", () => {
    const value = null as unknown as IpNetwork.IpNetwork
    if (IpNetwork.isIpv4Network(value)) {
      expect(value.address).type.toBe<Net.Ipv4Address>()
    } else {
      expect(value.address).type.toBe<Net.Ipv6Address>()
    }
  })

  it("supports both predicate call forms", () => {
    const value = null as unknown as IpNetwork.IpNetwork
    const address = null as unknown as Net.IpAddress
    expect(IpNetwork.contains(value, address)).type.toBe<boolean>()
    expect(IpNetwork.contains(address)(value)).type.toBe<boolean>()
    expect(IpNetwork.containsNetwork(value, value)).type.toBe<boolean>()
    expect(IpNetwork.containsNetwork(value)(value)).type.toBe<boolean>()
    expect(IpNetwork.overlaps(value, value)).type.toBe<boolean>()
    expect(IpNetwork.overlaps(value)(value)).type.toBe<boolean>()
  })

  it("exposes declaration and string transformation schemas", () => {
    expect(Schema.Ipv4Network).type.toBeAssignableTo<Schema.Codec<IpNetwork.Ipv4Network, IpNetwork.Ipv4Network>>()
    expect(Schema.Ipv6Network).type.toBeAssignableTo<Schema.Codec<IpNetwork.Ipv6Network, IpNetwork.Ipv6Network>>()
    expect(Schema.IpNetwork).type.toBeAssignableTo<Schema.Codec<IpNetwork.IpNetwork, IpNetwork.IpNetwork>>()
    expect(Schema.Ipv4NetworkFromString).type.toBeAssignableTo<Schema.Codec<IpNetwork.Ipv4Network, string>>()
    expect(Schema.Ipv6NetworkFromString).type.toBeAssignableTo<Schema.Codec<IpNetwork.Ipv6Network, string>>()
    expect(Schema.IpNetworkFromString).type.toBeAssignableTo<Schema.Codec<IpNetwork.IpNetwork, string>>()
  })
})
