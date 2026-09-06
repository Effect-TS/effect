---
"effect": patch
---

Fix token-bucket `RateLimitExceeded.retryAfter`, `onExceeded: "delay"`, and `resetAfter` to account for time elapsed since the last refill, including existing token reservations. For a limit of five tokens per five minutes, reserving one token from an exhausted bucket after 59 seconds now reports a one-second delay and a 301-second reset time. Calculate refill boundaries from the full window and a stable timestamp so fractional intervals do not accumulate rounding errors, including at epoch-sized timestamps. Round the total waits up to whole milliseconds, and clamp negative elapsed refill time to zero so backward clock skew does not inflate waits.

Custom `RateLimiterStore` implementations must update `tokenBucket` to accept the full `window: Duration.Duration` instead of `refillRate`, and return `readonly [remaining, retryAfterMillis, resetAfterMillis]` instead of a number. Compute all three values in the same atomic operation. Return zero retry delay when the request has enough tokens; otherwise, calculate the time needed to refill the token deficit, including reserved tokens and elapsed refill time. Calculate reset timing from the persisted token count, so rejected requests do not extend it. Consumers of the store method must destructure the tuple to access the remaining token count.

The Redis store maintains an additional `<prefix><key>:refill-state` hash with the same expiration as the existing token and refill keys. Existing numeric refill timestamps remain readable; no data migration is required.
