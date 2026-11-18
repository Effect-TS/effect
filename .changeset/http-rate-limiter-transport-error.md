---
"effect": minor
---

Add `failsWith` to `HttpClient.withRateLimiter` to report limiter failures as either raw limiter errors or HTTP transport errors.

Omitting the option still returns raw limiter errors at runtime. Calls with an omitted, hidden, or union-valued mode now add both `RateLimiterError` and `HttpClientError` to the inferred error type. Specify `failsWith: "RateLimiterError"` to retain the previous narrow type, or `failsWith: "HttpClientError"` to add only the HTTP error.
