---
"effect": patch
---

Fix `Cache.get` retaining zero-TTL lookup results, which could evict live entries.
