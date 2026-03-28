---
"@effect/openapi-generator": patch
---

Route 4xx/5xx void response schemas to the error channel instead of collapsing them to `Effect.void`.

HEAD endpoints (and any operation with bodiless error responses) now generate typed errors for 4xx/5xx status codes, preserving status-code semantics in the generated client. 2xx void schemas remain in the success channel.
