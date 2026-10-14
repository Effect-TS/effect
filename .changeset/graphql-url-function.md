---
"effect": patch
---

Allow `GraphQLProtocol.layerHttp` and `makeHttp` to take a `url` function, called per operation with the current context, kind and operation name, so one client can talk to several GraphQL servers. `GraphQLResolver` keeps lookups for different URLs in separate batches.
