---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add experimental `Host`, `Dns`, and `AddressResolver` modules to `effect/net` for host parsing, DNS queries, and endpoint resolution, with Node, Bun, and Deno implementations. Add host and DNS record schemas, including tagged-object JSON codecs for records.

Provide the services explicitly; they are not part of the platform service layers. For example, use `NodeAddressResolver.layer.pipe(Layer.provideMerge(NodeDns.layer))`.
