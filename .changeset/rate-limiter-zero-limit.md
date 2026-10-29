---
"effect": patch
---

Honor zero limits in `RateLimiterStore.fixedWindow` for the memory and Redis stores, reject over-limit first requests in the Redis fixed-window script, and return an infinite delay from delay-mode `RateLimiter.consume` when the limit is nonpositive.
