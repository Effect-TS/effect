# Multicast interface selection in Node and Bun

Research date: 2026-09-17. Official documentation describes the public contract; pinned Bun source below supplies implementation details, not a guarantee for every released version.

## Public APIs

Node's `node:dgram` uses strings: `addMembership(group, interface?)`, `dropMembership(group, interface?)`, and `setMulticastInterface(interface)`. For outgoing IPv4 multicast, the interface string is a local assigned IPv4 address, such as `192.168.1.20`. For IPv6, the documented form is a scoped IPv6 address such as `::%eth1` on Unix or `::%2` on Windows; the zone identifies the interface. Omitting the membership interface lets the OS choose one interface, not all interfaces. Joining on every interface requires separate calls. [Node datagram documentation](https://nodejs.org/api/dgram.html#socketsetmulticastinterfacemulticastinterface), [Node membership documentation](https://nodejs.org/api/dgram.html#socketaddmembershipmulticastaddress-multicastinterface)

Native `Bun.udpSocket` follows the same string-shaped controls. Its reference declares `addMembership(multicastAddress: string, interfaceAddress?: string): boolean` and `setMulticastInterface(interfaceAddress: string): boolean`. Its guide illustrates both omitted membership interfaces and explicit local IPv4 addresses. Bun does not present a standalone interface-name selector in this API. [Bun native UDP reference](https://bun.com/reference/bun/udpSocket), [Bun UDP guide](https://bun.com/docs/runtime/networking/udp)

## Bun implementation details

At commit `b52d5134815db1ec22a6133d2afaa3692b0f0033`, native membership and outgoing-interface methods parse IP-address strings into native socket addresses. Membership checks that a parsed explicit interface has the group's address family. A bare interface name is not resolved as an IPv4 address. The shared IPv6 parser interprets the zone using `if_nametoindex` on non-Windows platforms and numeric parsing on Windows; failed zone resolution becomes scope zero. Consequently, numeric zones such as `::%7` must not be assumed to work as numeric indices on every platform. [Pinned Bun methods](https://github.com/oven-sh/bun/blob/b52d5134815db1ec22a6133d2afaa3692b0f0033/src/runtime/socket/udp_socket.rs#L940-L1182), [Pinned Bun zone parser](https://github.com/oven-sh/bun/blob/b52d5134815db1ec22a6133d2afaa3692b0f0033/src/runtime/socket/udp_socket.rs#L1576-L1657)

The native socket layer passes the IPv4 address to `IP_MULTICAST_IF` and uses the IPv6 address's scope index for `IPV6_MULTICAST_IF`. Membership follows the same distinction: IPv4 stores the explicit local address or `INADDR_ANY`; IPv6 stores the explicit scope index or zero. These are native socket-control conventions, not an arbitrary distinction invented by the JavaScript API. [Pinned Bun socket controls](https://github.com/oven-sh/bun/blob/b52d5134815db1ec22a6133d2afaa3692b0f0033/packages/bun-usockets/src/bsd.c#L390-L459)

Bun's `node:dgram` compatibility methods delegate membership and outgoing-interface operations to the underlying socket. Its outgoing-interface wrapper converts the native method's false result into an invalid-argument exception. The compatibility surface is not a separate name-based interface abstraction. [Pinned Bun compatibility methods](https://github.com/oven-sh/bun/blob/b52d5134815db1ec22a6133d2afaa3692b0f0033/src/js/node/dgram.ts#L1250-L1313)

## Design implications for Effect

These are proposals inferred from the sources above, not runtime guarantees:

- A faithful low-level selector must retain the family-specific meanings: local IPv4 address versus IPv6 interface identity. Replacing an IPv4 address with an arbitrary number does not automatically give a portable native operation.
- A uniform branded interface name can improve the public interface, but it introduces a resolver. For IPv4 the adapter must enumerate local addresses, find the named interface, and select an IPv4 address. Multiple assigned addresses require an explicit ambiguity policy; missing interfaces and missing compatible addresses require checked failures.
- Node's enumeration supplies names and address records, with `scopeid` on IPv6 records. It does not expose a general interface-index property on IPv4-only records. Thus names are easier to enumerate than universal numeric indices through this API. [Node interface enumeration](https://nodejs.org/api/os.html#osnetworkinterfaces)
- Do not silently inherit the pinned Bun parser's invalid-zone fallback. If the Effect contract promises an explicit interface, resolve or validate it and fail when unavailable.
- Requiring an explicit membership interface in both families is an Effect policy decision, not required by the Node/Bun public signatures. Preserve optional selection unless the stronger explicitness requirement is intentional and documented.
- Receive-membership selection and outgoing-interface selection remain separate settings, even if both use the same branded name.
