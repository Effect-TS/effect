---
"effect": patch
---

Describe undeclared response statuses in `HttpApiClient` errors. The reason is still a `DecodeError`, now with the description `undeclared status code`, so the message reads `Decode: undeclared status code (418 GET ...)` instead of `Decode error (418 GET ...)`.
