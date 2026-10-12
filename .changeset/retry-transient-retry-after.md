---
"effect": patch
---

Honor `Retry-After` in `HttpClient.retryTransient`. Transient responses and status code errors now wait at least the requested delay before retrying, and the new `maxRetryAfter` option stops retrying when the requested delay is longer.
