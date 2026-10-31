---
"effect": patch
---

Fix `RateLimiter.layerStoreRedis` sharing state between different keys. A key ending in `:refill` or `:adaptive` no longer reads or writes another key's token-bucket refill time or adaptive state.
