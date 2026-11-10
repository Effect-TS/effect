---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Fix `HttpServerRequest.stream` failing on requests with no body; return an empty stream instead.
