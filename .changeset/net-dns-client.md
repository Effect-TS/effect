---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add an experimental `DnsClient` module to `effect/net`, a DNS client that speaks the DNS protocol and returns full responses with header flags, response codes, TTLs, and every record section. Queries go through a `DnsClient.Transport` provided by a layer: `NodeDnsClient`, `BunDnsClient`, and `DenoDnsClient` provide UDP transports, which retry truncated responses over TCP, and TCP transports, and `DnsClient.layerTransportHttps` sends queries as DNS over HTTPS (RFC 8484) with any `HttpClient`, which also works in browsers. Query names, search domains, and name servers can be given as strings such as `"1.1.1.1"` or `"[2001:db8::53]:5353"`, typed with the new `NetAddress.IpAddressInput` and `NetAddress.InetAddressInput`.

`DnsClient.layerDns` provides `Dns` from a client, with hosts file lookups, search domains, and CNAME following. The platform modules also provide a client configured from the system, for example with `DnsClient.layerDns.pipe(Layer.provide(NodeDnsClient.layer))`.
