import { Effect, Result, type Scope } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import { type DatagramSocket, Multicast } from "effect/unstable/socket"
import { describe, expect, it } from "tstyche"

describe("Multicast", () => {
  it("returns the existing datagram socket and requires a multicast factory and scope", () => {
    expect(Multicast.bind({ localAddress: NetAddress.inetAddressUnsafe(NetAddress.ipv4Unspecified, 5353) })).type.toBe<
      Effect.Effect<
        DatagramSocket.DatagramSocket,
        DatagramSocket.DatagramSocketError,
        Multicast.MulticastFactory | Scope.Scope
      >
    >()
    expect(Multicast.fromTransport(
      { localAddress: NetAddress.inetAddressUnsafe(NetAddress.ipv4Unspecified, 5353) },
      (options, _handlers) => {
        expect(options).type.toBe<Multicast.ResolvedBindOptions>()
        expect(options.hopLimit).type.toBe<number>()
        expect(options.loopback).type.toBe<boolean>()
        expect(options.reuseAddress).type.toBe<boolean>()
        expect(options.memberships).type.toBe<ReadonlyArray<Multicast.Membership>>()
        return Effect.succeed({ address: options.localAddress, send: () => Effect.void })
      }
    )).type.toBe<Effect.Effect<DatagramSocket.DatagramSocket, DatagramSocket.DatagramSocketError, Scope.Scope>>()
  })

  it("requires IPv6 membership interfaces and keeps interface families paired with groups", () => {
    const ipv4 = Result.getOrThrow(NetAddress.ipv4FromString("239.255.23.42"))
    const ipv6 = Result.getOrThrow(NetAddress.ipv6FromString("ff02::114"))
    const interfaceV4 = { _tag: "Ipv4", address: NetAddress.ipv4Loopback } as const
    const interfaceV6 = { _tag: "Ipv6", index: 1 } as const
    expect({ group: ipv4 }).type.toBeAssignableTo<Multicast.Membership>()
    expect({ group: ipv4, interface: interfaceV4 }).type.toBeAssignableTo<Multicast.Membership>()
    expect({ group: ipv6, interface: interfaceV6 }).type.toBeAssignableTo<Multicast.Membership>()
    expect({ group: ipv6 }).type.not.toBeAssignableTo<Multicast.Membership>()
    expect({ group: ipv6, interface: interfaceV4 }).type.not.toBeAssignableTo<Multicast.Membership>()
    expect({ group: ipv4, interface: interfaceV6 }).type.not.toBeAssignableTo<Multicast.Membership>()
    expect("eth0").type.not.toBeAssignableTo<Multicast.NetworkInterface>()
  })
})
