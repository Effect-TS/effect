---
"effect": patch
---

Honor `Retry-After` in `HttpClient.retryTransient`, preserving longer schedule delays. The new `maxRetryAfter` option defaults to one minute; longer requested waits stop retrying and return the last response or error. Set a larger cap to opt into longer waits.
