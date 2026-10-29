---
"effect": patch
---

Encode `HttpApiSchema.StreamSse` `data` values with the schema's JSON codec, so schemas such as `Schema.Date`, `Schema.BigInt` and `Schema.Option` round-trip through SSE events and are documented accurately in OpenAPI.
