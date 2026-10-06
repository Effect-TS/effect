---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Report the `101` status of a successful WebSocket upgrade to server middleware such as `HttpMiddleware.logger` and `HttpMiddleware.tracer`, instead of the handler's discarded response status.
