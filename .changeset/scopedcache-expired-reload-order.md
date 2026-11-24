---
"effect": patch
---

Fix `ScopedCache.get` keeping a reloaded expired entry in its old eviction position, so the next insertion at capacity no longer evicts the entry that was just reloaded and releases its new resource; it now evicts the least recently used entry, as `Cache.get` does.
