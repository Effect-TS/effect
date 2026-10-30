---
"effect": patch
---

Fix `RateLimiter.layerStoreRedis` sharing state between different keys. A key ending in `:refill` or `:adaptive` no longer reads or writes another key's token-bucket refill time or adaptive state.

`%` and `:` in rate-limit keys are now percent-encoded in Redis key names. Keys without those characters keep their existing Redis keys.

**Upgrading with the same prefix.** Redis state written by earlier versions is not migrated, and some of it can be read by different keys after upgrading. For example, state written for `account%3Aalice` is read by `account:alice`, and a leftover `<key>:refill` counter is read as `<key>`'s refill time. Writers still running an earlier version keep producing such state. To avoid this, either deploy the new version with a fresh `prefix` that does not overlap the previous one (the default is `ratelimiter:`; for example `ratelimiter-v2:`), which starts all rate-limit state fresh, or delete the keys under the previous prefix once every writer has upgraded.
