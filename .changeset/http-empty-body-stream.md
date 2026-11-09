---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

`HttpServerRequest.stream` returns an empty stream when a web request has no body, including a `PUT` with `Content-Length: 0` on the Bun and Deno servers.
