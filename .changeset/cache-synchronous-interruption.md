---
"effect": patch
---

Remove synchronously interrupted `Cache.get` lookups from the cache so later callers can retry instead of repeatedly receiving the cached interruption.
