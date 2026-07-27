---
"effect": patch
---

Fix `Socket.makeWebSocket` and `Socket.fromWebSocket` so message handler effects no longer require `Socket.WebSocket`, which is supplied at runtime.
