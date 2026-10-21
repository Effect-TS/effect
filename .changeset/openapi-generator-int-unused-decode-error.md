---
"effect": patch
"@effect/openapi-generator": patch
---

Render bare numbers with a standard leading integer check as `Schema.Int`, preserving custom annotations and other checks. Only emit the `decodeError` helper in generated HTTP clients when an operation has error responses.
