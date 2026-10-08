---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add experimental name resolution to `effect/net`: `Host` for domain names and `host:port` endpoints, the `Dns` service for address lookups and DNS record queries, and the `AddressResolver` service for resolving endpoints to socket addresses, with Node, Bun, and Deno implementations and matching `Schema` schemas. The network address schemas now also encode to and from JSON.

`Dns` and `AddressResolver` are not included in `NodeServices`, `BunServices`, or `DenoServices`; provide them explicitly, for example with `NodeAddressResolver.layer.pipe(Layer.provideMerge(NodeDns.layer))`.
