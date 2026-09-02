---
"@effect/openapi-generator": patch
---

Encode multipart record payloads as native `FormData` in generated schema-backed clients, including SSE and binary streaming methods, instead of sending `[object Object]` as plain text. Omitted optional fields remain absent from the request.
