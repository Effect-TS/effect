---
"effect": minor
---

Add `failsWith` to `HttpClient.withRateLimiter`: omit it for `RateLimiterError`, or select `"HttpClientError"` to wrap limiter failures as transport errors.

An explicit `WithRateLimiter.Options` annotation now includes both possible errors. Use `satisfies WithRateLimiter.Options` to retain the narrower error type for a literal choice.
