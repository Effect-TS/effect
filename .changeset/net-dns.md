---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add name resolution to `effect/net`:

- `Host` models domain names, hosts, and unresolved `host:port` endpoints, including internationalized names. `NetAddress` adds `ScopedIpv6Literal` for IPv6 literals with a named zone such as `fe80::1%eth0`, and `IpFamily` (`"IPv4" | "IPv6"`), `FamilyAddress`, `familyOf`, and `isFamily` for working with address families. `NetworkInterfaceAddress.family` is now typed as `IpFamily`.
- `Dns` provides the `Dns` service (`lookup`, `resolve`, `reverse`, and `resolveInet` / `resolveSocketAddress` for converting a `HostPort` into `NetAddress` values), DNS record values, and a static resolver for tests. `Host.toInetAddress` converts numeric hosts without a lookup.
- `NodeDns`, `BunDns`, and `DenoDns` provide the service, and the platform `*Services` layers now include it.
- `Schema` adds `Port`, `DomainName`, `Host`, `HostPort`, `DnsRecord`, and `DnsRecordType`, and the network address schemas now serialize to and from JSON using their canonical string forms.
