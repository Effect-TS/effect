---
"effect": patch
---

Fix `ScopedCache.get` and `ScopedCache.getOption` succeeding with an already-released value when the cache's scope closes during the lookup; they are now interrupted.
