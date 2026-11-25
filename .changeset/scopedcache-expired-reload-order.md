---
"effect": patch
---

Fix `ScopedCache.get` to move reloaded expired entries to the most recently used position so they are not evicted next at capacity.
