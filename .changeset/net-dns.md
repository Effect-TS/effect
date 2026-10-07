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
- `Dns` provides the `Dns` service: `lookup`, `resolve`, `reverse`, and `resolveInet` / `resolveSocketAddress` for converting a `HostPort` into `NetAddress` values.
- `Dns` adds DNS record values and a static resolver for tests.
- `NodeDns`, `BunDns`, and `DenoDns` provide the `Dns` service for each runtime.
- `Schema` adds `Port`, `DomainName`, `Host`, `HostPort`, `DnsRecord`, and `DnsRecordType`.
- The network address schemas now serialize to and from JSON, as canonical strings or, for Unix-domain addresses, `{ path }` objects, and support arbitrary generation.

### Breaking changes

- The `NodeServices`, `BunServices`, and `DenoServices` layers and types now include `Dns`. Layers built by hand and annotated with one of these types must also provide the runtime's `Dns` layer, such as `NodeDns.layer`.
- `NetAddress.NetworkInterfaceAddress.family` is now typed as `IpFamily` instead of `string`. Values typed with `family: string` must be narrowed to `"IPv4" | "IPv6"` before being passed to `scopeIdsFromInterfaces`; results of `os.networkInterfaces()` already have the narrower type.
