---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add experimental `effect/net/DnsClient` with UDP, TCP, and DNS over HTTPS transports, plus `NodeDnsClient`, `BunDnsClient`, and `DenoDnsClient`.

`Dns.Cname.target` is now `string` rather than `Host.DomainName` to support non-host DNS names. Resolver results are fully qualified and may preserve case. Consumers that need a `Host.DomainName` must parse the target and handle failure.
