---
"effect": patch
---

Fix token-bucket `RateLimitExceeded.retryAfter`, `onExceeded: "delay"`, and `resetAfter` to account for time elapsed since the last refill, including existing token reservations. For a limit of five tokens per five minutes, reserving one token from an exhausted bucket after 59 seconds now reports a one-second delay and a 301-second reset time. Calculate refill boundaries from the full window and a stable timestamp so fractional intervals do not accumulate rounding errors, including at epoch-sized timestamps. Round the total waits up to whole milliseconds, and clamp negative elapsed refill time to zero so backward clock skew does not inflate waits.

Both stores now agree on refill boundaries: a full bucket discards partial refill progress, so it can no longer grant `limit + 1` tokens in a burst; changing `window` or `limit` for an existing key settles refills under the previous configuration before measuring new boundaries; and the Redis store preserves fractional token counts instead of truncating them to integers. Once the previous bucket has fully recovered, configuration changes start a full bucket with the new limit and window, whether Redis state has expired or is still retained.

Redis expiration rounds the stored deficit up to whole-token refills and rounds their duration up to whole milliseconds. For example, consuming half a token from a bucket allowing three tokens per second retains its state for at least 334 milliseconds, instead of expiring after 166 milliseconds and admitting requests too early. Expiration is unchanged for integer token deficits with integer refill intervals.

Custom `RateLimiterStore` implementations must update `tokenBucket` to accept the full `window: Duration.Duration` instead of `refillRate`, and return `readonly [remaining, retryAfterMillis, resetAfterMillis]` instead of a number. Compute all three values in the same atomic operation. Return zero retry delay when the request has enough tokens; otherwise, calculate the time needed to refill the token deficit, including reserved tokens and elapsed refill time. Calculate reset timing from the persisted token count, so rejected requests do not extend it. Consumers of the store method must destructure the tuple to access the remaining token count.

The Redis store maintains an additional `<prefix><key>:refill-state` hash (`anchor`, `count`, `window`, `limit`, `lastRefill`) with the same expiration as the existing token and refill keys. Existing numeric refill timestamps remain readable; no data migration is required.
