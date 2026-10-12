---
"effect": patch
---

Fix `HttpClient.withRateLimiter` reading a `Retry-After` HTTP date as a number of seconds.
