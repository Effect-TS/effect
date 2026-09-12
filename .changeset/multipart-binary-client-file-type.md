---
"@effect/openapi-generator": patch
---

Generated HTTP clients now type `multipart/form-data` fields that use `format: binary` as `globalThis.File | globalThis.Blob`.

A binary field was previously emitted as `string`, so passing a `File` (the value accepted by `HttpClientRequest.bodyFormDataRecord`) failed to type-check even though it worked at runtime. `httpapi` output is unchanged.
