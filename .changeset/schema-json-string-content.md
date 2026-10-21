---
"effect": patch
---

Restore encoded content schemas for `Schema.fromJsonString` in schema representations and JSON Schema, including SSE event data in OpenAPI.

Content declarations and checks now participate in code generation and persistence; add any missing `toCode` callbacks or `representation` identities.
