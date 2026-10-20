---
"effect": patch
---

Preserve the encoded content schema of `Schema.fromJsonString` in schema representations and generated JSON Schema, including SSE event data in OpenAPI. Content definitions now participate in code generation and persistence; supply `toCode` callbacks or persistence identities when those operations require them.
