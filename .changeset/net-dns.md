---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add name resolution to `effect/net`:

- `Host` models domain names, hosts, and unresolved `host:port` endpoints, including internationalized names.
- `NetAddress` adds `ScopedIpv6Literal` for IPv6 literals with a named zone such as `fe80::1%eth0`.
- `NetAddress` adds `IpFamily` (`"IPv4" | "IPv6"`), `FamilyAddress`, `familyOf`, and `isFamily` for working with address families.
- `Dns` provides the `Dns` service: `lookup` for the addresses of a host name, `resolve` for DNS records, and `reverse` for the names of an address.
- `Dns` adds DNS record values and a static resolver for tests.
- `NodeDns`, `BunDns`, and `DenoDns` provide the `Dns` service for each runtime.
- `NodeDns` exposes `lookup` and `makeResolver` as building blocks for other runtimes that implement `node:dns`.
- `AddressResolver` provides the `AddressResolver` service, which resolves a `HostPort` into internet or socket addresses with `resolve`, using `Dns` for domain names.
- `NodeAddressResolver`, `BunAddressResolver`, and `DenoAddressResolver` provide `AddressResolver` layers that look up named IPv6 zones such as `fe80::1%eth0` in the host's network interfaces each time they are resolved.
- `Schema` adds `Port`, `DomainName`, `Host`, `HostPort`, `DnsRecord`, and `DnsRecordType`.
- The network address schemas now serialize to and from JSON, as canonical strings or, for Unix-domain addresses, `{ path }` objects, and support arbitrary generation.

The new `AddressResolver`, `Dns`, and `Host` modules, their runtime modules, the new `NetAddress` APIs, and the new schemas are experimental and may change in patch releases. The `Dns` and `AddressResolver` services are not part of `NodeServices`, `BunServices`, or `DenoServices`; provide them explicitly, for example with `NodeAddressResolver.layer.pipe(Layer.provideMerge(NodeDns.layer))`.
