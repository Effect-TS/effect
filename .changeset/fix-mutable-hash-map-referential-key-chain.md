---
"effect": patch
---

Fix a memory leak in `MutableHashMap`: re-inserting an entry under a new, structurally equal object key, as every `Cache.get` and `ScopedCache.get` hit does, kept every previously used key alive.
