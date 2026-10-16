---
"effect": patch
---

Apply GraphQL resolver batch limits independently per protocol URL and `batchKey`, so interleaved lookups for different tenants or servers do not fragment each other's batches. `GraphQLResolver.request` resolves each lookup's URL in the calling fiber, so lookups that rely on a `Context.Reference` default are no longer routed with another lookup's value.
