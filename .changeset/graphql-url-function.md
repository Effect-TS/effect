---
"effect": patch
---

Support per-request URLs in `GraphQLProtocol.layerHttp` and `makeHttp`, as a function of the context and operation or as an `Effect<string>`. `GraphQLResolver` batches lookups by URL.
