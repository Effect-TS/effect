---
"effect": patch
---

Add `HttpClient.timeout`, which fails requests that receive no response within the given duration with an `HttpClientError` wrapping a `TransportError`, so the timed client keeps the standard `HttpClient` service type and is retried by `retryTransient`. The timeout covers the request until response headers arrive; reading the response body is not covered.
