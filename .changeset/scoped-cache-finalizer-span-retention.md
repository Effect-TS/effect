---
"effect": patch
---

Stop `ScopedCache` entries whose lookup registers a finalizer from retaining the first requester's span and its response until the entry is removed. Lookups no longer inherit the requesting effect's span, so spans created inside a lookup are no longer children of the first request that missed the cache.
