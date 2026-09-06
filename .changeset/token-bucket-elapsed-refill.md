---
"effect": patch
---

Fix token-bucket `retryAfter`, `delay` and `resetAfter` in the memory and Redis stores. They now subtract the time already elapsed in the current refill interval instead of always reporting whole intervals.

`RateLimiterStore.tokenBucket` now returns `[remaining, elapsedMillis]` instead of `remaining`. Custom stores must return both values from the same atomic operation; see the `tokenBucket` docs for the contract. Returning `[remaining, 0]` keeps the old timing bug.
