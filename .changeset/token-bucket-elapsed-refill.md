---
"effect": patch
---

Fix token-bucket retry and delay timing in memory and Redis by accounting for elapsed refill time. `resetAfter` also accounts for elapsed time and reserved debt.

`RateLimiterStore.tokenBucket` now returns `[remaining, elapsedMillis]` instead of a number. Custom stores must return both values atomically; `elapsedMillis` is the time since the last refill boundary in milliseconds, preserving fractional values.

Returning `[remaining, 0]` retains the timing bug. Restart the refill interval for new or full buckets, but preserve it on reads of partially filled buckets.
