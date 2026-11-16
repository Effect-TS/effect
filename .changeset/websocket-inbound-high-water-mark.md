---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
---

Add a `websocket.highWaterMark` inbound byte limit to the Bun, Deno, and Node HTTP servers, close sockets that cannot pause once `Socket.fromWebSocket` overflows, and keep Deno WebSocket frames that arrive before the client closes.
