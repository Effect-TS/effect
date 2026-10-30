---
"effect": patch
---

Add `HttpClient.timeout`, which fails requests that receive no response within the given duration with an `HttpClientError` wrapping a `TransportError`, so the timed client keeps the standard `HttpClient` service type and is retried by `retryTransient`. The timeout covers the wrapped client until it returns a response, which for a plain client is when the response headers arrive; body reads after that are not covered.
