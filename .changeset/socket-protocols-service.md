---
"effect": patch
---

Add a `SocketProtocols` schema to `effect/socket` for the `Sec-WebSocket-Protocol` header, and an `HttpSocketProtocols` service to `effect/http` that reads the negotiated sub-protocol list from the current request.
