import type { Effect } from "effect"
import type * as Arr from "effect/Array"
import type * as AddressResolver from "effect/net/AddressResolver"
import type * as Dns from "effect/net/Dns"
import type * as Host from "effect/net/Host"
import type * as NetAddress from "effect/net/NetAddress"
import { describe, expect, it } from "tstyche"

declare const resolver: AddressResolver.AddressResolver
declare const hostPort: Host.HostPort
declare const inet: NetAddress.InetAddress
declare const socket: NetAddress.SocketAddress
declare const unix: NetAddress.UnixPathAddress
declare const family: NetAddress.IpFamily

type Resolved<A> = Effect.Effect<Arr.NonEmptyReadonlyArray<A>, Dns.DnsError | NetAddress.NetAddressError>

describe("AddressResolver", () => {
  it("returns internet addresses for internet targets", () => {
    expect(resolver.resolve(hostPort)).type.toBe<Resolved<NetAddress.InetAddress>>()
    expect(resolver.resolve(inet)).type.toBe<Resolved<NetAddress.InetAddress>>()
    expect(resolver.resolve(hostPort, { family })).type.toBe<Resolved<NetAddress.InetAddress>>()
  })

  it("narrows by family only for literal families", () => {
    expect(resolver.resolve(hostPort, { family: "IPv4" })).type.toBe<Resolved<NetAddress.InetAddressV4>>()
    expect(resolver.resolve(inet, { family: "IPv6" })).type.toBe<Resolved<NetAddress.InetAddressV6>>()
  })

  it("returns socket addresses for targets that may be Unix paths", () => {
    expect(resolver.resolve(socket)).type.toBe<Resolved<NetAddress.SocketAddress>>()
    expect(resolver.resolve(socket, { family: "IPv4" })).type.toBe<Resolved<NetAddress.SocketAddress>>()
    expect(resolver.resolve(unix)).type.toBe<Resolved<NetAddress.SocketAddress>>()
  })
})
