---
"@effect/platform-node": patch
---

Fail refused WebSocket upgrades with `SocketError` instead of hanging the request fiber, and skip HTTP response writes on destroyed sockets.
