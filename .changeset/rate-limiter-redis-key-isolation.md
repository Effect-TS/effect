---
"effect": patch
---

Fix `RateLimiter.layerStoreRedis` sharing state between different keys. A key ending in `:refill` or `:adaptive` no longer reads or writes another key's token-bucket refill time or adaptive state.

`%` and `:` in rate-limit keys are now percent-encoded in Redis key names. Keys without those characters keep their existing Redis keys; keys containing them start with fresh state after upgrading.
