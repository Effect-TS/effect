# Datagram socket controls: multicast, broadcast, and hop limits

Research date: 2026-09-17. This note describes runtime capabilities and design implications; it does not claim that Effect currently exposes these controls. Primary sources are the current official runtime documentation, IETF RFCs, and pinned runtime source where noted.

## What the controls do

Unicast UDP sends to one destination host interface. Broadcast and multicast change who may receive a datagram, but neither adds delivery, ordering, retransmission, congestion-control, or backpressure guarantees.

- **IPv4 broadcast** sends to every host on a local subnet's broadcast address. `SO_BROADCAST` is a permission bit for sending such packets; it is not a subscription and has no IPv6 equivalent. Broadcast is normally constrained to the local subnet. [Node `setBroadcast`](https://nodejs.org/api/dgram.html#socketsetbroadcastflag), [RFC 8085 section 3.1.3](https://www.rfc-editor.org/rfc/rfc8085.html#section-3.1.3)
- **Multicast** sends once to a group address. Receivers ask the kernel to join that group on a particular local network interface. Joining controls reception; a sender need not join, and joining does not select the sender's outgoing interface. Group membership is interface-specific, so a multihomed receiver may need one join per interface. [RFC 8304 appendix A](https://www.rfc-editor.org/rfc/rfc8304.html#appendix-A), [Node `addMembership`](https://nodejs.org/api/dgram.html#socketaddmembershipmulticastaddress-multicastinterface)
- **Any-source multicast (ASM)** accepts traffic to group `G` from any sender. **Source-specific multicast (SSM)** joins a channel `(S,G)` and accepts only source `S`. IPv4 reserves `232.0.0.0/8` for SSM; IPv6 reserves `FF3x::/32`. [RFC 4607 sections 1 and 4](https://www.rfc-editor.org/rfc/rfc4607.html)
- **TTL / hop limit** limits how far an outgoing packet may traverse routers. Each router decrements it and stops forwarding at zero. IPv6 calls the field a *Hop Limit*, although Node and Bun retain the `TTL` method name. Ordinary and multicast traffic have separate socket options. Node accepts `1..255` for ordinary TTL (usual default 64) and `0..255` for multicast TTL (usual default 1). A multicast TTL of 1 prevents forwarding beyond the local network; increasing it does not itself enable multicast routing. [Node `setTTL`](https://nodejs.org/api/dgram.html#socketsetttlttl), [Node `setMulticastTTL`](https://nodejs.org/api/dgram.html#socketsetmulticastttlttl), [RFC 8304 appendix A](https://www.rfc-editor.org/rfc/rfc8304.html#appendix-A)
- **Multicast loopback** decides whether a host receives a local copy of its own multicast transmissions when it has joined the group. This is useful for same-host participants and tests and is generally enabled by default. [Node `setMulticastLoopback`](https://nodejs.org/api/dgram.html#socketsetmulticastloopbackflag), [libuv UDP guide](https://docs.libuv.org/en/stable/guide/networking.html#udp)
- **Multicast outgoing interface** selects the NIC used to send multicast. In Node, IPv4 uses an address assigned to that interface; IPv6 uses a zone such as `::%eth1`, or an interface number such as `::%2` on Windows. This is distinct from the interface argument of a receive membership. [Node `setMulticastInterface`](https://nodejs.org/api/dgram.html#socketsetmulticastinterfacemulticastinterface)

Closing a socket removes its memberships in the kernel. Explicit leave/drop is needed only when a process wants to stop one membership while keeping the socket alive. [Node `dropMembership`](https://nodejs.org/api/dgram.html#socketdropmembershipmulticastaddress-multicastinterface)

## Node.js and Bun

| Capability | Node `node:dgram` | Native `Bun.udpSocket` | Portable implication |
| --- | --- | --- | --- |
| Broadcast | `setBroadcast` | `setBroadcast` | IPv4 only; must be enabled before a broadcast send. |
| Ordinary hop limit | `setTTL` | `setTTL` | Socket-wide, not per datagram. Prefer the cross-family name `hopLimit` in an Effect API. |
| Multicast hop limit | `setMulticastTTL` | `setMulticastTTL` | Separate from ordinary traffic; socket-wide. |
| Multicast loopback | `setMulticastLoopback` | `setMulticastLoopback` | Socket-wide and observable by every user of a shared socket. |
| Outgoing multicast interface | `setMulticastInterface` | `setMulticastInterface` | Requires a portable network-interface identity, not an arbitrary runtime string. |
| ASM join/leave | `addMembership` / `dropMembership` | same | Membership is `(group, interface)` state owned by the socket. |
| SSM join/leave | `addSourceSpecificMembership` / `dropSourceSpecificMembership` | same | Membership is `(source, group, interface)` state. |

Node exposes every method above. Most control methods require an already bound socket; calling `addMembership` on an unbound socket instead causes an implicit bind to a random port on all interfaces. If a native socket is shared by cluster workers, Node says the membership must be added only once. Effect's acquisition path already binds before it returns, so it should configure memberships after native bind and before publishing the socket. [Node datagram API](https://nodejs.org/api/dgram.html)

Bun's native socket is already bound when `Bun.udpSocket()` resolves and exposes the same broadcast, TTL, multicast-interface, loopback, ASM, and SSM methods on both connected and unconnected socket types. Its native send API requires numeric destination addresses, reports local buffer pressure with a boolean, and signals later writability through `drain`. [Bun UDP guide](https://bun.com/docs/runtime/networking/udp), [Bun native UDP reference](https://bun.com/reference/bun/udpSocket)

The runtime return shapes differ: Bun documents booleans for membership/interface/broadcast/loopback and numbers for TTL setters, while Node membership calls return no useful value and the methods throw on native failure. Effect should normalize successful control operations to `void` and retain the native cause in a checked socket error. Bun's implementation likewise performs synchronous `setsockopt` calls and throws system errors on failure. [Bun native UDP reference](https://bun.com/reference/bun/udpSocket), [pinned Bun UDP implementation](https://github.com/oven-sh/bun/blob/b52d5134815db1ec22a6133d2afaa3692b0f0033/src/runtime/socket/udp_socket.rs#L842-L1225)

## Related controls and portability

Node additionally exposes kernel send/receive buffer sizing and inspection, send-queue diagnostics, `reuseAddr`, `reusePort`, `ipv6Only`, DNS lookup customization, blocklists, and socket-wide abort. `SO_RCVBUF` is not the same as Effect's `receiveCapacityBytes`: the former buffers packets in the kernel before the runtime callback; the latter bounds packets already delivered into Effect's userland queue. [Node buffer controls](https://nodejs.org/api/dgram.html#socketsetrecvbuffersizesize), [Node socket options](https://nodejs.org/api/dgram.html#dgramcreatesocketoptions-callback)

These options are less portable. Bun's documented native creation options contain only host, port, binary type, handlers, and optional peer association. Node's `reusePort` is available only on listed operating systems, and libuv documents materially different `reuseAddr` behavior across platforms. They must not be advertised as uniform guarantees. [Bun native UDP reference](https://bun.com/reference/bun/udpSocket), [libuv UDP flags](https://docs.libuv.org/en/v1.x/udp.html#c.uv_udp_flags)

Address reuse nevertheless belongs in the initial multicast implementation plan because discovery listeners commonly share a well-known port. Bun's `node:dgram` compatibility exposes the broader socket interface, making a shared Node-compatible multicast adapter a candidate even while ordinary `BunDatagramSocket` continues to use native Bun UDP. Verify delivery to multiple subscribers under each supported runtime and OS; successful binding alone is insufficient evidence. [Bun socket options](https://bun.com/reference/node/dgram/SocketOptions), [Bun compatibility](https://bun.com/docs/runtime/nodejs-compat#node-dgram)

**Correction from implementation planning:** Deno's compatibility documentation lists Node-compatible multicast, broadcast, and TTL methods as non-functional stubs, but the source for Deno **2.9.4**, used by this repository's CI at research time, implements these operations. Its UDP wrapper calls native operations for IPv4/IPv6 memberships, multicast settings, and broadcast. The source-specific membership path shown there accepts IPv4 addresses only. The existing shared `node:dgram` adapter is therefore a viable candidate for Deno multicast, subject to runtime tests; a separate Deno-native implementation is not established as necessary. [Deno compatibility page](https://docs.deno.com/runtime/reference/node_apis/#nodedgram), [Deno 2.9.4 UDP implementation](https://github.com/denoland/deno/blob/v2.9.4/ext/node/polyfills/internal_binding/udp_wrap.ts)

## Recommendation for Effect's `DatagramSocket`

The current unicast contract does **not** need these controls. Binding, peer association, packet boundaries, bounded userland buffering, scoped closure, and send backpressure remain coherent without them. Avoid delaying that contract merely to mirror every native socket method.

Broadcast and multicast are nevertheless functional capabilities, not mere tuning knobs. Applications such as mDNS/SSDP-style discovery, DHCP-like protocols, routing protocols, telemetry, media distribution, and multicast market data need native configuration that the current `reader`/`writer` interface does not expose.

Recommended staging, incorporating the subsequent naming and implementation discussion:

1. **Keep the base `DatagramSocket` minimal.** Do not add Node-shaped mutable methods to every implementation.
2. **Add `Multicast` as a specialized acquisition module.** `Multicast.bind` configures a native endpoint and returns an ordinary `DatagramSocket`, reusing `DatagramSocket.fromTransport` for buffering, I/O, and scoped cleanup. Broadcast configuration belongs with ordinary datagram binding when needed.
3. **Start with memberships fixed at acquisition.** Join every requested group before returning the socket. Any setup failure closes the partially acquired endpoint. Socket closure removes its memberships. Dynamic scoped joins can follow through a multicast-capable socket subtype; arbitrary existing datagram sockets do not expose the necessary native controls.
4. **Prefer declarative, acquisition-time multicast settings:** `hopLimit`, `loopback`, and `outgoingInterface`. Public set/send/reset mutation races when concurrent fibers share a writer, because these options affect the whole socket rather than one packet.
5. **Model interface identity explicitly.** IPv4 needs a local interface address, while IPv6 naturally needs a numeric scope/interface id. Effect's `NetAddress.InetAddressV6.scopeId` can help with IPv6, but an endpoint-with-port is not itself a clean network-interface type.
6. **Address reuse is part of the initial multicast plan.** Verify shared-port reception on supported runtimes and operating systems. Keep kernel buffer tuning and load-balancing `reusePort` controls in a later advanced-options tier.
7. **Continue using numeric addresses at this transport layer.** That preserves the existing Node/Bun parity and keeps DNS outside low-level socket configuration.

If the near-term goal is only unicast request/reply and peer-associated UDP, these additions are unnecessary. For discovery or multicast consumers, add the capability as a complete unit: membership, interface selection, loopback, multicast hop limit, and tested address-reuse behavior.
