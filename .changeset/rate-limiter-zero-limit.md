---
"effect": patch
---

Fix `RateLimiter` handling of zero and negative limits:

- `RateLimiterStore.fixedWindow` now honors a zero `limit` in the memory and Redis stores.
- The Redis fixed-window script now rejects an over-limit first request instead of charging it.
- Delay-mode `RateLimiter.consume` now returns an infinite delay for a nonpositive limit instead of admitting requests.
