---
"effect": patch
---

Honor `Retry-After` in `HttpClient.retryTransient`. Waits longer than the new `maxRetryAfter` option (one minute by default) stop retrying and return the last response or error.
