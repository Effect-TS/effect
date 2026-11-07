---
"effect": minor
---

Add JSON and StringTree codecs, arbitraries, formatters, and code generation to the `effect/net` schemas, so `Config.schema(Schema.HostPort)` and `Schema.toCodecJson(Schema.SocketAddress)` work. Values encode as their canonical strings: lowercase colon-separated MAC addresses, dotted-decimal IPv4 and RFC 5952 IPv6 addresses, CIDR notation for interfaces and networks, `address:port` or `[address]:port` for `InetAddress` and `HostPort`, and `unix://<path>` for `UnixPathAddress`. Add `SchemaRepresentation` revivers for the net declarations, and arbitraries for `Schema.DomainName` and `Schema.ScopedIpv6Literal`.

`Schema.IpAddress`, `Schema.InetAddress` and `Schema.SocketAddress` are now unions (`Ipv4Address | Ipv6Address`, `InetAddressV4 | InetAddressV6` and `InetAddress | UnixPathAddress`) instead of declarations. Their `Type` is unchanged. Code that relied on them being declarations needs updating:

- `Schema.declare<NetAddress.IpAddress>` and similar annotations no longer accept these schemas. Use the schema's own type, such as `Schema.IpAddress`, or `Schema.Codec<NetAddress.IpAddress>`.
- Their ASTs are `SchemaAST.Union` nodes, so `SchemaAST.isDeclaration` checks and `typeParameters` reads no longer match.
- `toCodecJson`, `toCodecStringTree`, `toCodecIso`, `toCodec`, `toCodecArbitrary` and `toCode` annotations on these schemas are now ignored, because those hooks are only read on declarations. Derivation silently falls back to the built-in codecs, which can change a persisted format. Annotate the member declarations instead, for example `Schema.Union([Schema.Ipv4Address.annotate({ toCodecJson }), Schema.Ipv6Address.annotate({ toCodecJson })])`, or decode from an explicit encoding such as `Schema.IpAddressFromString`. A `toFormatter` annotation on the union still applies.

The JSON and StringTree codecs for `UnixPathAddress`, which `SocketAddress` uses for Unix-domain addresses, require the `unix://` prefix, so a path such as `127.0.0.1:80` cannot be read as an internet address. To decode a raw path, use `Schema.UnixPathAddressFromString`.
