---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Enforce `MaxBodySize` on buffered request body reads in `BunHttpServer`, `DenoHttpServer`, and `HttpServerRequest.fromClientRequest`.
