---
"effect": patch
---

Fix `HttpApiClient` reporting a response status the endpoint doesn't declare as a `DecodeError`. It now fails with an `HttpClientError` whose reason is a `StatusCodeError`, whatever the response body.
