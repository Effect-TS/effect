---
"effect": patch
---

Fix token-bucket retry and delay timing in the memory and Redis rate limiter stores. After consuming five tokens in a five-minute window, a one-token request 59 seconds later now waits one second instead of 60 seconds.

`RateLimiterStore.tokenBucket` now returns `readonly [remaining: number, elapsedMillis: number]` instead of a number. Custom stores must return the signed count after attempted consumption plus the elapsed portion of the current refill interval, in milliseconds, from the same atomic operation. Advance the refill boundary by whole intervals before computing elapsed time, preserve fractional milliseconds, and use zero elapsed time for a new bucket. Failed requests must not persist a negative count; delay reservations must persist their debt. Simply wrapping the old count as `[remaining, 0]` retains the timing bug.

For token buckets, `ConsumeResult.resetAfter` now reports the time until the bucket returns to full capacity if no further tokens are consumed. It subtracts the elapsed portion of the current refill interval, includes reserved debt in delay mode, and is clamped to zero. Fixed-window reset semantics are unchanged.
