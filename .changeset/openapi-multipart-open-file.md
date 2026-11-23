---
"@effect/openapi-generator": patch
---

Fix generated `multipart/form-data` payloads rejecting `format: binary` files in open object schemas while preserving undeclared form fields.
