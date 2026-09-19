---
"@effect/openapi-generator": patch
---

Generated HTTP clients now type `multipart/form-data` fields with `format: binary` as `File | Blob` instead of `string`. `httpapi` output is unchanged.

Referenced components containing binary fields use `*Multipart` exports, such as `UploadBodyMultipart`. If a component is used only by multipart requests, update imports from its original name to the generated name. Components also used by JSON requests or responses keep their original exports and string fields.
