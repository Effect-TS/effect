---
"@effect/platform-node": patch
---

Fix `NodeHttpServer` shutdown to initiate graceful WebSocket closure and bound unresponsive upgraded connections by `gracefulShutdownTimeout`.
