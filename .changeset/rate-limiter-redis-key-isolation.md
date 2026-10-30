---
"effect": patch
---

Fix `RateLimiter.layerStoreRedis` sharing state between different keys. A key ending in `:refill` or `:adaptive` no longer reads or writes another key's token-bucket refill time or adaptive state.

`%` and `:` in rate-limit keys are now percent-encoded in Redis key names. Keys without those characters keep their existing Redis keys.

**Upgrading with the same prefix.** State written by earlier versions is not migrated, and some of it is read by different keys after upgrading: legacy state for `account%3Aalice` is read by `account:alice`, and a leftover `<key>:refill` counter is read as `<key>`'s refill time. Writers still on an earlier version keep producing such state. Either:

- deploy with a fresh `prefix` that does not overlap the previous one (for example `ratelimiter-v2:` instead of the default `ratelimiter:`), which starts all rate-limit state fresh, or
- delete the keys under the previous prefix once every writer has upgraded.
