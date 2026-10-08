---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add the experimental `DnsClient` service to `effect/net`, a DNS client that speaks the DNS protocol over `DatagramSocket` and `Socket`. `DnsClient.query` returns full responses with header flags, response codes, TTLs, and the answer, authority, and additional sections, reusing the `Dns` record values. Queries use a new socket and a random ID for every attempt, retry truncated responses over TCP, and try each name server in turn.

`DnsClient.layerDns` provides `Dns` from a `DnsClient`, with hosts file lookups, search domains, and CNAME following; `parseResolvConf` and `parseHosts` read the system configuration. `NodeDnsClient`, `BunDnsClient`, and `DenoDnsClient` provide the client from the system configuration, for example with `DnsClient.layerDns.pipe(Layer.provide(NodeDnsClient.layer))`.
