---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add an experimental `DnsClient` module to `effect/net` with UDP, TCP, and DNS over HTTPS transports, plus `NodeDnsClient`, `BunDnsClient`, and `DenoDnsClient`. `Dns.Cname` targets are now `string` instead of `Host.DomainName`.
