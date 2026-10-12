---
"effect": patch
---

Read a `Retry-After` HTTP date as a date in `HttpClient.withRateLimiter`. The header was searched for its first number, so `Retry-After: Wed, 21 Oct 2026 07:28:00 GMT` waited 21 seconds instead of until that time.
