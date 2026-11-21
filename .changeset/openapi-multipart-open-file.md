---
"@effect/openapi-generator": patch
---

Fix generated `multipart/form-data` payloads rejecting `format: binary` files when the object schema omits `additionalProperties` or sets it to `true`; form fields beyond the declared properties are dropped from the decoded payload.
