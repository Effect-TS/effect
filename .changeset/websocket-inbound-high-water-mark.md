---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
---

Add a `websocket.highWaterMark` inbound byte limit to the Bun, Deno, and Node HTTP servers. A WebSocket that cannot pause now stops reading and closes once `Socket.fromWebSocket` reports a `highWaterMark` overflow, and empty frames count as one byte. Deno WebSocket frames that arrive before the client closes are no longer lost.
