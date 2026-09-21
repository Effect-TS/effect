import type { NonEmptyReadonlyArray } from "effect/Array"
import type * as Channel from "effect/Channel"
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Types from "effect/Types"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as DatagramSocket from "effect/unstable/socket/DatagramSocket"
import { describe, expect, it } from "tstyche"

declare const associated: DatagramSocket.Associated
declare const unassociated: DatagramSocket.Unassociated
declare const socket: DatagramSocket.DatagramSocket
declare const g4: NetAddress.MulticastAddress<NetAddress.Ipv4Address>
declare const g6: NetAddress.MulticastAddress<NetAddress.Ipv6Address>
declare const gAny: NetAddress.MulticastAddress
declare const ipv4: NetAddress.Ipv4Address
declare const ipv6: NetAddress.Ipv6Address
declare const ip: NetAddress.IpAddress
declare const written:
  | NetAddress.MulticastAddress<NetAddress.Ipv4Address>
  | NetAddress.MulticastAddress<NetAddress.Ipv6Address>
declare const associatedOptions: DatagramSocket.MakeAssociatedOptions
declare const unassociatedOptions: DatagramSocket.MakeUnassociatedOptions
declare const associatedV4: DatagramSocket.Associated<NetAddress.Ipv4Address>
declare const unassociatedV4: DatagramSocket.Unassociated<NetAddress.Ipv4Address>
declare const localV4: NetAddress.InetAddressV4
declare const localV6: NetAddress.InetAddressV6
declare const localAny: NetAddress.InetAddress
declare const packetV4: DatagramSocket.Packet<NetAddress.Ipv4Address>
declare const packetV6: DatagramSocket.Packet<NetAddress.Ipv6Address>
declare const associatedOptionsV4: DatagramSocket.MakeAssociatedOptions<NetAddress.Ipv4Address>
declare const unassociatedOptionsV4: DatagramSocket.MakeUnassociatedOptions<NetAddress.Ipv4Address>

describe("DatagramSocket endpoint variants", () => {
  it("preserves the DatagramSocket address helper aliases", () => {
    expect<DatagramSocket.Family<NetAddress.MulticastAddress<NetAddress.Ipv4Address>>>().type.toBe<
      NetAddress.Family<NetAddress.MulticastAddress<NetAddress.Ipv4Address>>
    >()
    expect<DatagramSocket.Inet<NetAddress.Ipv6Address>>().type.toBe<NetAddress.Inet<NetAddress.Ipv6Address>>()
    expect<DatagramSocket.FamilyOf<NetAddress.InetAddressV4>>().type.toBe<
      NetAddress.Family<NetAddress.InetAddressV4>
    >()
    expect<DatagramSocket.MulticastInterface<NetAddress.Ipv6Address>>().type.toBe<
      NetAddress.MulticastInterface<NetAddress.Ipv6Address>
    >()
  })

  it("returns the explicit association variants from raw constructors", () => {
    expect(DatagramSocket.makeAssociated(associatedOptions)).type.toBe<DatagramSocket.Associated>()
    expect(DatagramSocket.makeUnassociated(unassociatedOptions)).type.toBe<DatagramSocket.Unassociated>()
  })

  it("infers family precision from the local address and raw constructors", () => {
    expect(DatagramSocket.bind({ localAddress: localV4 })).type.toBe<
      Effect.Effect<
        DatagramSocket.Unassociated<NetAddress.Ipv4Address>,
        DatagramSocket.DatagramSocketError,
        DatagramSocket.DatagramSocketFactory | Scope.Scope
      >
    >()
    expect(DatagramSocket.bind({ localAddress: localV6 })).type.toBe<
      Effect.Effect<
        DatagramSocket.Unassociated<NetAddress.Ipv6Address>,
        DatagramSocket.DatagramSocketError,
        DatagramSocket.DatagramSocketFactory | Scope.Scope
      >
    >()
    expect(DatagramSocket.bind({ localAddress: localAny })).type.toBe<
      Effect.Effect<
        DatagramSocket.Unassociated,
        DatagramSocket.DatagramSocketError,
        DatagramSocket.DatagramSocketFactory | Scope.Scope
      >
    >()
    expect(DatagramSocket.makeAssociated(associatedOptionsV4)).type.toBe<
      DatagramSocket.Associated<NetAddress.Ipv4Address>
    >()
    expect(DatagramSocket.makeUnassociated(unassociatedOptionsV4)).type.toBe<
      DatagramSocket.Unassociated<NetAddress.Ipv4Address>
    >()
  })

  it("does not infer or widen the family from a remote or packet", () => {
    DatagramSocket.connect({ localAddress: localV4, remote: localV4 })
    // @ts-expect-error!
    DatagramSocket.connect({ localAddress: localV4, remote: localV6 })
    unassociatedV4.write(packetV4)
    // @ts-expect-error!
    unassociatedV4.write(packetV6)
  })

  it("keeps erased service provision sound", () => {
    Effect.succeed(undefined).pipe(Effect.provideService(DatagramSocket.DatagramSocket, socket))
    expect(unassociatedV4[DatagramSocket.TypeId]).type.toBe<{
      readonly _A: Types.Invariant<NetAddress.Ipv4Address>
    }>()
    expect(unassociatedV4).type.not.toBeAssignableTo<DatagramSocket.DatagramSocket>()
    expect(associatedV4).type.not.toBeAssignableTo<DatagramSocket.DatagramSocket>()
    // @ts-expect-error!
    const erased: DatagramSocket.DatagramSocket = unassociatedV4
    void erased
  })

  it("narrows by the association discriminant tags", () => {
    if (socket._tag === "Associated") {
      expect(socket).type.toBe<DatagramSocket.Associated>()
      expect(socket.remote).type.toBe<NetAddress.InetAddress>()
    } else {
      expect(socket).type.toBe<DatagramSocket.Unassociated>()
    }
  })
})

describe("DatagramSocket.toChannel", () => {
  it("infers associated payload input", () => {
    expect(DatagramSocket.toChannel(associated)).type.toBe<
      Channel.Channel<
        NonEmptyReadonlyArray<DatagramSocket.Packet>,
        DatagramSocket.DatagramSocketError,
        void,
        NonEmptyReadonlyArray<Uint8Array>,
        never
      >
    >()
  })

  it("infers unassociated packet input", () => {
    expect(DatagramSocket.toChannel(unassociated)).type.toBe<
      Channel.Channel<
        NonEmptyReadonlyArray<DatagramSocket.Packet>,
        DatagramSocket.DatagramSocketError,
        void,
        NonEmptyReadonlyArray<DatagramSocket.Packet>,
        never
      >
    >()
  })

  it("propagates the upstream error type", () => {
    expect(DatagramSocket.toChannelWith<string>()(associated)).type.toBe<
      Channel.Channel<
        NonEmptyReadonlyArray<DatagramSocket.Packet>,
        DatagramSocket.DatagramSocketError | string,
        void,
        NonEmptyReadonlyArray<Uint8Array>,
        string
      >
    >()
  })

  it("requires narrowing the socket union", () => {
    // @ts-expect-error No overload matches this call.
    DatagramSocket.toChannel(socket)
  })

  it("preserves a precise family through channel output and input", () => {
    expect(DatagramSocket.toChannel(unassociatedV4)).type.toBe<
      Channel.Channel<
        NonEmptyReadonlyArray<DatagramSocket.Packet<NetAddress.Ipv4Address>>,
        DatagramSocket.DatagramSocketError,
        void,
        NonEmptyReadonlyArray<DatagramSocket.Packet<NetAddress.Ipv4Address>>,
        never
      >
    >()
    expect(DatagramSocket.toChannelWith<string>()(associatedV4)).type.toBe<
      Channel.Channel<
        NonEmptyReadonlyArray<DatagramSocket.Packet<NetAddress.Ipv4Address>>,
        DatagramSocket.DatagramSocketError | string,
        void,
        NonEmptyReadonlyArray<Uint8Array>,
        string
      >
    >()
  })
})

describe("DatagramSocket multicast membership", () => {
  it("keeps MembershipOptions generic in its declared address type", () => {
    expect<DatagramSocket.MembershipOptions<NetAddress.Ipv4Address>["source"]>().type.toBe<
      NetAddress.Ipv4Address | undefined
    >()
    expect<DatagramSocket.MembershipOptions<NetAddress.Ipv6Address>["source"]>().type.toBe<
      NetAddress.Ipv6Address | undefined
    >()
    expect<DatagramSocket.MembershipOptions["source"]>().type.toBe<NetAddress.IpAddress | undefined>()
  })

  it("accepts correct-family literals, unbranded sources, bound IPv4 options, and no options", () => {
    const ipv4Options: DatagramSocket.MembershipOptions<NetAddress.Ipv4Address> = {
      interface: ipv4,
      source: ipv4
    }
    socket.addMembership(g4)
    socket.addMembership(g4, { interface: ipv4, source: ipv4 })
    socket.addMembership(g4, ipv4Options)
    socket.addMembership(g6, { interface: 1, source: ipv6 })
  })

  it("rejects wrong-family interfaces and sources", () => {
    // @ts-expect-error!
    socket.addMembership(g4, { interface: 1 })
    // @ts-expect-error!
    socket.addMembership(g4, { source: ipv6 })
    // @ts-expect-error!
    socket.addMembership(g6, { interface: ipv4 })
    // @ts-expect-error!
    socket.addMembership(g6, { source: ipv4 })
  })

  it("correlates precise sockets with groups, sources, and selectors", () => {
    unassociatedV4.addMembership(g4, { interface: ipv4, source: ipv4 })
    unassociatedV4.setMulticastInterface(ipv4)
    // @ts-expect-error!
    unassociatedV4.addMembership(g6, { interface: 1, source: ipv6 })
    // @ts-expect-error!
    unassociatedV4.setMulticastInterface(1)
  })

  it("requires a branded multicast group", () => {
    // @ts-expect-error!
    socket.addMembership(ipv4)
    // @ts-expect-error!
    socket.addMembership(ip)
  })

  it("does not widen a family-specific group from a widened options value", () => {
    const widened: DatagramSocket.MembershipOptions = { source: ip }
    const ipv6Options: DatagramSocket.MembershipOptions<NetAddress.Ipv6Address> = { source: ipv6 }
    // @ts-expect-error!
    socket.addMembership(g4, widened)
    // @ts-expect-error!
    socket.addMembership(g4, ipv6Options)
    // @ts-expect-error!
    socket.addMembership(g6, widened)
  })

  it("applies the family contract to public and raw membership operations", () => {
    const ipv4Options: DatagramSocket.MembershipOptions<NetAddress.Ipv4Address> = { source: ipv4 }
    const ipv6Options: DatagramSocket.MembershipOptions<NetAddress.Ipv6Address> = { source: ipv6 }

    socket.addMembership(g4, ipv4Options)
    socket.dropMembership(g4, ipv4Options)
    unassociatedOptions.addMembership(g4, ipv4Options)
    unassociatedOptions.dropMembership(g4, ipv4Options)
    associatedOptions.addMembership(g4, ipv4Options)
    associatedOptions.dropMembership(g4, ipv4Options)

    // @ts-expect-error!
    socket.addMembership(g4, ipv6Options)
    // @ts-expect-error!
    socket.dropMembership(g4, ipv6Options)
    // @ts-expect-error!
    unassociatedOptions.addMembership(g4, ipv6Options)
    // @ts-expect-error!
    unassociatedOptions.dropMembership(g4, ipv6Options)
    // @ts-expect-error!
    associatedOptions.addMembership(g4, ipv6Options)
    // @ts-expect-error!
    associatedOptions.dropMembership(g4, ipv6Options)
  })

  it("accepts every family shape for a family-agnostic group", () => {
    const widened: DatagramSocket.MembershipOptions = { source: ip }
    socket.addMembership(gAny, { interface: ipv4 })
    socket.addMembership(gAny, { interface: 1, source: ipv4 })
    socket.addMembership(gAny, { source: ipv6 })
    socket.addMembership(gAny, widened)
  })

  it("composes multicast and family guards", () => {
    if (NetAddress.isMulticast(ip)) {
      if (NetAddress.isIpv4Address(ip)) {
        socket.addMembership(ip, { source: ipv4 })
        // @ts-expect-error!
        socket.addMembership(ip, { source: ipv6 })
      } else {
        socket.addMembership(ip, { source: ipv6 })
        // @ts-expect-error!
        socket.addMembership(ip, { source: ipv4 })
      }
    }
  })

  it("accepts plain sources for a written multicast-family union", () => {
    socket.addMembership(written, { source: ipv4 })
    socket.addMembership(written, { source: ipv6 })
  })
})
