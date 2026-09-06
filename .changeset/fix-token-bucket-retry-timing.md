---
"effect": patch
---

Fix token-bucket `RateLimitExceeded.retryAfter` and `onExceeded: "delay"` to account for time elapsed since the last refill, including existing token reservations. For a limit of five tokens per five minutes, an exhausted bucket now reports a one-second retry after 59 seconds. Fractional refill intervals are preserved, with the total wait rounded up to whole milliseconds.

Custom `RateLimiterStore` implementations must update `tokenBucket` to return `readonly [remaining, retryAfterMillis]` instead of a number. Compute both values in the same atomic operation. Return zero delay when the request has enough tokens; otherwise, calculate the time needed to refill the token deficit, including reserved tokens and elapsed refill time. Consumers of the store method must destructure the tuple to access the remaining token count.
