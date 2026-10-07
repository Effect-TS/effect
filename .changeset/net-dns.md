---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-deno": minor
---

Add name resolution to `effect/net`:

- `Host` models domain names, hosts, and unresolved `host:port` endpoints, including internationalized names. `NetAddress` adds `ScopedIpv6Literal` for IPv6 literals with a named zone such as `fe80::1%eth0`.
- `Dns` provides the `Dns` service (`lookup`, `resolve`, `reverse`), DNS record values, `resolveInet` for converting a `HostPort` into `NetAddress` values, and a static resolver for tests.
- `NodeDns`, `BunDns`, and `DenoDns` provide the service, and the platform `*Services` layers now include it.
- `Schema` adds `Port`, `DomainName`, `Host`, `HostPort`, `DnsRecord`, and `DnsRecordType`, and the network address schemas now serialize to and from JSON using their canonical string forms.
