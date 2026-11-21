---
"@effect/openapi-generator": patch
---

Fix generated `multipart/form-data` payloads rejecting `format: binary` files in plain object schemas that omit `additionalProperties` or set it to `true`; form fields beyond the declared properties are dropped from the decoded payload.
