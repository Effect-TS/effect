---
"@effect/platform-node": patch
---

Fix slow `NodeHttpServer` shutdown with connected WebSocket clients. Shutdown now closes WebSockets with code 1001 as soon as it starts, and destroys upgraded connections that are still open after `gracefulShutdownTimeout` instead of also waiting out the WebSocket closing handshake.
