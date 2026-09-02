---
"effect": patch
---

Fix `Cache.invalidateWhen` and `ScopedCache.invalidateWhen` deleting a replacement entry while waiting for an earlier lookup. They now return `false` when the original entry is no longer cached, preserving the replacement value and ensuring scoped replacement resources are released when the cache's owning scope closes.
