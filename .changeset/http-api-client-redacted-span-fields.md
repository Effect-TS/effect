---
"effect": patch
---

Redact `HttpApiClient` query and header fields with `Redacted` schemas in client span attributes.

Add `HttpApiSchema.sensitive` to mark plain query and header fields as sensitive. Annotated and `Redacted` fields are redacted in `HttpApiClient` spans and in the server spans of `HttpApiBuilder` endpoints, while their values are still sent and received as is.
