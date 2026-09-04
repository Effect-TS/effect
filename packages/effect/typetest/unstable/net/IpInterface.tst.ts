import type { Result, Schema } from "effect"
import * as IpInterface from "effect/unstable/net/IpInterface"
import type * as IpNetwork from "effect/unstable/net/IpNetwork"
import * as NetAddress from "effect/unstable/net/NetAddress"
import { describe, expect, it } from "tstyche"

describe("IpInterface", () => {
  it("preserves address families in checked constructors", () => {
    expect(IpInterface.make(NetAddress.ipv4Unspecified, 0)).type.toBe<
      Result.Result<IpInterface.Ipv4Interface, IpInterface.IpInterfaceError>
    >()
    expect(IpInterface.make(NetAddress.ipv6Unspecified, 0)).type.toBe<
      Result.Result<IpInterface.Ipv6Interface, IpInterface.IpInterfaceError>
    >()
    const address = null as unknown as NetAddress.IpAddress
    expect(IpInterface.make(address, 0)).type.toBe<
      Result.Result<IpInterface.IpInterface, IpInterface.IpInterfaceError>
    >()
  })

  it("preserves families in parsers and unsafe constructors", () => {
    expect(IpInterface.ipv4FromString("127.0.0.1/8")).type.toBe<
      Result.Result<IpInterface.Ipv4Interface, IpInterface.IpInterfaceError>
    >()
    expect(IpInterface.ipv6FromString("::1/64")).type.toBe<
      Result.Result<IpInterface.Ipv6Interface, IpInterface.IpInterfaceError>
    >()
    expect(IpInterface.fromString("::1/64")).type.toBe<
      Result.Result<IpInterface.IpInterface, IpInterface.IpInterfaceError>
    >()
    expect(IpInterface.makeUnsafe(NetAddress.ipv4Unspecified, 0)).type.toBe<IpInterface.Ipv4Interface>()
    expect(IpInterface.fromStringUnsafe("::1/64")).type.toBe<IpInterface.IpInterface>()
  })

  it("narrows interface unions and preserves network families", () => {
    const value = null as unknown as IpInterface.IpInterface
    if (IpInterface.isIpv4Interface(value)) {
      expect(value.address).type.toBe<NetAddress.Ipv4Address>()
      expect(IpInterface.network(value)).type.toBe<IpNetwork.Ipv4Network>()
    } else {
      expect(value.address).type.toBe<NetAddress.Ipv6Address>()
      expect(IpInterface.network(value)).type.toBe<IpNetwork.Ipv6Network>()
    }
  })

  it("preserves exact Schema types", () => {
    expect<Schema.Schema.Type<typeof Schema.Ipv4InterfaceFromString>>().type.toBe<IpInterface.Ipv4Interface>()
    expect<Schema.Schema.Type<typeof Schema.Ipv6InterfaceFromString>>().type.toBe<IpInterface.Ipv6Interface>()
    expect<Schema.Schema.Type<typeof Schema.IpInterfaceFromString>>().type.toBe<IpInterface.IpInterface>()
    expect<Schema.Codec.Encoded<typeof Schema.IpInterfaceFromString>>().type.toBe<string>()
  })
})
