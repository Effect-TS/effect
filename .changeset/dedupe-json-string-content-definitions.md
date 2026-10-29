---
"effect": patch
---

Reuse identified JSON Schema definitions for `Schema.fromJsonString` content, including SSE event data in OpenAPI, instead of emitting identical `_1` suffixed copies when a schema's encoded side differs from its type side.
