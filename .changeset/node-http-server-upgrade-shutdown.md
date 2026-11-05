---
"@effect/platform-node": patch
---

Close upgraded connections such as WebSockets when `NodeHttpServer` shuts down, so it no longer waits out `gracefulShutdownTimeout` and the WebSocket closing handshake.
