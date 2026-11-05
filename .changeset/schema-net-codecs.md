---
"effect": minor
---

Add JSON and StringTree codecs, arbitraries, formatters, and code generation to the `effect/net` schemas, so `Config.schema(Schema.HostPort)` and `Schema.toCodecJson(Schema.SocketAddress)` work. Values encode as their canonical strings: `host:port` and `[IPv6]:port` for `HostPort` and `InetAddress`, CIDR notation for interfaces and networks, and `unix://<path>` for `UnixPathAddress`. Add `SchemaRepresentation` revivers for the net declarations, and arbitraries for `Schema.DomainName` and `Schema.ScopedIpv6Literal`.

`Schema.IpAddress`, `Schema.InetAddress` and `Schema.SocketAddress` are now unions of their members (`Ipv4Address | Ipv6Address`, `InetAddressV4 | InetAddressV6`, and `InetAddress | UnixPathAddress`) instead of declarations. Their decoded types are unchanged, but code that depends on them being declarations needs updating:

- Type annotations such as `Schema.declare<NetAddress.IpAddress>` no longer accept these schemas. Use the schema's own type (`Schema.IpAddress`) or `Schema.Codec<NetAddress.IpAddress>`.
- Their ASTs are `SchemaAST.Union` nodes, so `SchemaAST.isDeclaration` checks and reads of `typeParameters` no longer match.
- `toCodecJson`, `toCodecStringTree`, `toCodec` and `toCodecArbitrary` annotations on these schemas are ignored, because those hooks are only read on declarations (`toFormatter` still applies). Codec derivation silently falls back to the built-in codecs, which can change a persisted format. Annotate the member declarations instead, for example `Schema.Union([Schema.Ipv4Address.annotate({ toCodecJson }), Schema.Ipv6Address.annotate({ toCodecJson })])`, or decode from an explicit encoding such as `Schema.IpAddressFromString`.

The JSON and StringTree codecs for `UnixPathAddress` (and the Unix-domain member of `SocketAddress`) require the `unix://` prefix, so a path like `127.0.0.1:80` cannot be confused with an internet address. Use `Schema.UnixPathAddressFromString` to decode a raw path.
