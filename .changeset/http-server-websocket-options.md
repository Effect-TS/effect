---
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Allow configuring the WebSocket server in `NodeHttpServer` and `BunHttpServer`.

The HTTP server layers previously hardcoded their WebSocket wiring — `NodeHttpServer` always constructed `new WebSocketServer({ noServer: true })`, and `BunHttpServer` overwrote any `websocket` key in the serve options with its own handlers. There was no way to enable `permessage-deflate` compression (which browsers offer on every connection) or tune payload limits.

Both servers now accept a `websocket` option that is forwarded to the underlying implementation, with the wiring/lifecycle options the server manages excluded from the type:

```ts
// Node: forwarded to the `ws` WebSocketServer
NodeHttpServer.layer(() => createServer(), {
  port: 3000,
  websocket: { perMessageDeflate: true }
})

// Bun: merged into Bun.serve's websocket handler
BunHttpServer.layer({
  port: 3000,
  websocket: { perMessageDeflate: true }
})
```
