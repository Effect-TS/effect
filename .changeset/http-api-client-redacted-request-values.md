---
"effect": patch
---

Keep `Redacted` values passed to `HttpApiClient` redacted when the request is inspected, for example through a failed request's `HttpClientError`. When the query, headers or payload schema of an endpoint declares a `Redacted` value (through `Schema.Redacted` or `Schema.RedactedFromValue`, including inside structs, collections, unions, classes and recursive schemas), every value encoded from that part is redacted in inspection; the request still sends the plain values. A custom declaration that holds a `Redacted` value without exposing it as a type parameter, and unwraps it in its own codec, is not detected. `Redacted` path parameters are not covered either.

Adds `Headers.setRedacted` and `HttpBody.redact`, and `Headers.fromInput` now returns an existing `Headers` value unchanged.
