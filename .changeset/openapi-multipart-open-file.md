---
"@effect/openapi-generator": patch
---

Fix generated `multipart/form-data` payloads rejecting `format: binary` files when the object schema omits `additionalProperties` or sets it to `true`.
