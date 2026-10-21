---
"@effect/platform": patch
"@effect/platform-bun": patch
---

Log status 101 for upgraded WebSocket requests served by BunHttpServer.

`HttpApp.toHandled` now passes an `HttpServerResponse` returned by the send handler to middleware in place of the handler's response.
