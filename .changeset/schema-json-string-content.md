---
"effect": patch
---

Restore encoded content schemas for `Schema.fromJsonString` in schema representations and JSON Schema, including SSE event data in OpenAPI.

`Schema.fromJsonString` now ignores explicit `contentMediaType` and `contentSchema` annotations on its encoded String. Plain `Schema.String` schemas still honor those annotations.

Content declarations and checks now participate in code generation and persistence; add any missing `toCode` callbacks or `representation` identities.

The encoded projection of `Schema.fromJsonString` no longer carries a `contentMediaType` annotation.
