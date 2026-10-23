---
"effect": patch
---

Keep `Redacted` values passed to `HttpApiClient` redacted when the request is inspected, for example through a failed request's `HttpClientError`. When the query, headers or payload of a call contain a `Redacted` value, every value encoded from that part is redacted in inspection; the request still sends the plain values. Adds `Headers.setRedacted` and `HttpBody.redact`, and `Headers.fromInput` now returns an existing `Headers` value unchanged.
