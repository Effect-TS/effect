import type { Result, Schema } from "effect"
import * as IpInterface from "effect/unstable/net/IpInterface"
import * as IpNetwork from "effect/unstable/net/IpNetwork"
import * as NetAddress from "effect/unstable/net/NetAddress"
import { describe, expect, it } from "tstyche"

// Widen the branded constants to retain coverage of base-family inference.
const ipv4Unspecified: NetAddress.Ipv4Address = NetAddress.ipv4Unspecified
const ipv6Unspecified: NetAddress.Ipv6Address = NetAddress.ipv6Unspecified

describe("IpNetwork", () => {
  it("preserves address families in checked constructors", () => {
    expect(IpNetwork.make(ipv4Unspecified, 0)).type.toBe<
      Result.Result<IpNetwork.Ipv4Network, NetAddress.NetAddressError>
    >()
    expect(IpNetwork.make(ipv6Unspecified, 0)).type.toBe<
      Result.Result<IpNetwork.Ipv6Network, NetAddress.NetAddressError>
    >()
    expect(IpNetwork.fromAddress(ipv4Unspecified, 0)).type.toBe<
      Result.Result<IpNetwork.Ipv4Network, NetAddress.NetAddressError>
    >()
    expect(IpNetwork.fromInterface(IpInterface.makeUnsafe(ipv4Unspecified, 0))).type.toBe<
      IpNetwork.Ipv4Network
    >()
    expect(IpNetwork.fromInterface(IpInterface.makeUnsafe(ipv6Unspecified, 0))).type.toBe<
      IpNetwork.Ipv6Network
    >()
    const ipv4Network = IpNetwork.makeUnsafe(ipv4Unspecified, 0)
    expect(IpNetwork.firstAddress(ipv4Network)).type.toBe<NetAddress.Ipv4Address>()
    expect(IpNetwork.lastAddress(ipv4Network)).type.toBe<NetAddress.Ipv4Address>()
    const address = null as unknown as NetAddress.IpAddress
    expect(IpNetwork.make(address, 0)).type.toBe<Result.Result<IpNetwork.IpNetwork, NetAddress.NetAddressError>>()
    expect(IpNetwork.fromAddress(address, 0)).type.toBe<
      Result.Result<IpNetwork.IpNetwork, NetAddress.NetAddressError>
    >()
  })

  it("preserves families in parsers and unsafe constructors", () => {
    expect(IpNetwork.ipv4FromString("0.0.0.0/0")).type.toBe<
      Result.Result<IpNetwork.Ipv4Network, NetAddress.NetAddressError>
    >()
    expect(IpNetwork.ipv6FromString("::/0")).type.toBe<
      Result.Result<IpNetwork.Ipv6Network, NetAddress.NetAddressError>
    >()
    expect(IpNetwork.fromString("::/0")).type.toBe<Result.Result<IpNetwork.IpNetwork, NetAddress.NetAddressError>>()
    expect(IpNetwork.makeUnsafe(ipv4Unspecified, 0)).type.toBe<IpNetwork.Ipv4Network>()
    expect(IpNetwork.fromAddressUnsafe(ipv6Unspecified, 0)).type.toBe<IpNetwork.Ipv6Network>()
    expect(IpNetwork.fromStringUnsafe("::/0")).type.toBe<IpNetwork.IpNetwork>()
  })

  it("preserves refinements only when address bits are unchanged", () => {
    const precise = IpNetwork.make(NetAddress.ipv4Unspecified, 0)
    expect(precise).type.toBe<
      Result.Result<
        IpNetwork.IpNetwork<NetAddress.UnspecifiedAddress<NetAddress.Ipv4Address>>,
        NetAddress.NetAddressError
      >
    >()
    expect(precise).type.toBeAssignableTo<Result.Result<IpNetwork.Ipv4Network, NetAddress.NetAddressError>>()
    expect<Result.Result<IpNetwork.Ipv4Network, NetAddress.NetAddressError>>().type.not.toBeAssignableTo<
      typeof precise
    >()

    const network = IpNetwork.makeUnsafe(NetAddress.ipv4Unspecified, 0)
    expect(network).type.toBe<
      IpNetwork.IpNetwork<NetAddress.UnspecifiedAddress<NetAddress.Ipv4Address>>
    >()
    expect(IpNetwork.firstAddress(network)).type.toBe<NetAddress.UnspecifiedAddress<NetAddress.Ipv4Address>>()
    expect(IpNetwork.lastAddress(network)).type.toBe<NetAddress.Ipv4Address>()
    expect(IpNetwork.lastAddress(network)).type.not.toBeAssignableTo<NetAddress.UnspecifiedAddress>()

    expect(IpNetwork.fromAddress(NetAddress.ipv6Loopback, 64)).type.toBe<
      Result.Result<IpNetwork.Ipv6Network, NetAddress.NetAddressError>
    >()
    expect(IpNetwork.fromInterface(IpInterface.makeUnsafe(NetAddress.ipv6Loopback, 64))).type.toBe<
      IpNetwork.Ipv6Network
    >()
  })

  it("drops refinements from derived addresses", () => {
    const multicast = NetAddress.multicastAddressUnsafe(
      NetAddress.ipv4FromBytesUnsafe(new Uint8Array([224, 0, 0, 1]))
    )
    expect(IpNetwork.fromAddress(multicast, 0)).type.toBe<
      Result.Result<IpNetwork.Ipv4Network, NetAddress.NetAddressError>
    >()
    expect(IpNetwork.fromAddressUnsafe(multicast, 0)).type.toBe<IpNetwork.Ipv4Network>()
    expect(IpNetwork.fromInterface(IpInterface.makeUnsafe(multicast, 0))).type.toBe<IpNetwork.Ipv4Network>()

    const canonical = NetAddress.multicastAddressUnsafe(
      NetAddress.ipv4FromBytesUnsafe(new Uint8Array([224, 0, 0, 0]))
    )
    const network = IpNetwork.makeUnsafe(canonical, 4)
    expect(network).type.toBe<IpNetwork.IpNetwork<typeof canonical>>()
    expect(IpNetwork.firstAddress(network)).type.toBe<typeof canonical>()
    expect(IpNetwork.lastAddress(network)).type.toBe<NetAddress.Ipv4Address>()
    expect(IpNetwork.lastAddress(network)).type.not.toBeAssignableTo<NetAddress.MulticastAddress>()

    const input = null as unknown as NetAddress.IpAddress
    if (NetAddress.isMulticast(input)) {
      expect(IpNetwork.fromAddress(input, 0)).type.toBe<
        Result.Result<IpNetwork.IpNetwork, NetAddress.NetAddressError>
      >()
      expect(IpNetwork.fromInterface(IpInterface.makeUnsafe(input, 0))).type.toBe<IpNetwork.IpNetwork>()
    }
  })

  it("narrows generic networks", () => {
    const value = null as unknown as IpNetwork.IpNetwork
    if (IpNetwork.isIpv4Network(value)) {
      expect(value.address).type.toBe<NetAddress.Ipv4Address>()
    } else if (IpNetwork.isIpv6Network(value)) {
      expect(value.address).type.toBe<NetAddress.Ipv6Address>()
    }
  })

  it("supports both predicate call forms", () => {
    const value = null as unknown as IpNetwork.IpNetwork
    const address = null as unknown as NetAddress.IpAddress
    expect(IpNetwork.contains(value, address)).type.toBe<boolean>()
    expect(IpNetwork.contains(address)(value)).type.toBe<boolean>()
    expect(IpNetwork.containsNetwork(value, value)).type.toBe<boolean>()
    expect(IpNetwork.containsNetwork(value)(value)).type.toBe<boolean>()
    expect(IpNetwork.overlaps(value, value)).type.toBe<boolean>()
    expect(IpNetwork.overlaps(value)(value)).type.toBe<boolean>()
  })

  it("preserves exact Schema types", () => {
    expect<Schema.Schema.Type<typeof Schema.Ipv4NetworkFromString>>().type.toBe<IpNetwork.Ipv4Network>()
    expect<Schema.Schema.Type<typeof Schema.Ipv6NetworkFromString>>().type.toBe<IpNetwork.Ipv6Network>()
    expect<Schema.Schema.Type<typeof Schema.IpNetworkFromString>>().type.toBe<IpNetwork.IpNetwork>()
    expect<Schema.Codec.Encoded<typeof Schema.IpNetworkFromString>>().type.toBe<string>()
  })
})
