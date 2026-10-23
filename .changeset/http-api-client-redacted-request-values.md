---
"effect": patch
---

Keep `Redacted` values passed to `HttpApiClient` redacted when the request is inspected, for example through a failed request's `HttpClientError`. Query parameters, headers, payloads encoded as URL parameters and serialized bodies are covered; the request still sends the plain values. Adds `Headers.setRedacted` and `HttpBody.redact`.
