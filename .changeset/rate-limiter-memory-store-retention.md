---
"effect": patch
---

Reclaim expired keys in `RateLimiter.layerStoreMemory`. Each entry now expires once its state is indistinguishable from an unseen key, matching the TTLs of the Redis store, and a background sweep scoped to the layer removes expired entries every minute, so an idle store drains to empty instead of retaining every key it has seen.
