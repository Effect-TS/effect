---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add experimental `Host`, `Dns`, and `AddressResolver` modules to `effect/net` for host parsing, DNS queries, and endpoint resolution, with Node, Bun, and Deno services. DNS operations accept and normalize domain-name strings; endpoint resolution also accepts `host:port` strings. Add scoped IPv6 literals and host and DNS record schemas, including JSON codecs for records.

Provide the services explicitly; they are not included in the platform `*Services` layers. Use `NodeAddressResolver.layer.pipe(Layer.provideMerge(NodeDns.layer))` to provide both Node services.
