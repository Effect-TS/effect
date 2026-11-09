---
"effect": patch
---

Interrupt pending `ScopedCache.get` and `ScopedCache.getOption` calls when their lookup completes after the cache's owner scope closes.
