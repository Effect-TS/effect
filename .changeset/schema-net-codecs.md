---
"effect": patch
---

Add JSON and StringTree codecs, arbitraries, formatters, and code generation to the `effect/net` schemas, so `Config.schema(Schema.HostPort)` and `Schema.toCodecJson(Schema.SocketAddress)` work. Values encode as their canonical strings: `host:port` and `[IPv6]:port` for `HostPort` and `InetAddress`, CIDR notation for interfaces and networks, the raw path for `UnixPathAddress`, and `unix://<path>` for the Unix-domain branch of `SocketAddress`. Add `SchemaRepresentation` revivers for these declarations, and arbitraries for `Schema.DomainName` and `Schema.ScopedIpv6Literal`.
