---
"@effect/platform-node": patch
---

Fix `NodeHttpServer` shutdown waiting for the graceful shutdown timeout and WebSocket closing handshakes while upgraded connections stay open.
