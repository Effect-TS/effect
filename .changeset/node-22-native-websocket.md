---
"@effect/platform-node": minor
"@effect/platform-node-shared": minor
"@effect/platform-bun": minor
"@effect/opentelemetry": minor
"@effect/docgen": minor
"@effect/ai-openai": patch
---

Node.js 22.19.0 is now the minimum supported version for `@effect/platform-node`, `@effect/platform-node-shared`, `@effect/opentelemetry` and `@effect/docgen`, up from 18. `@effect/platform-node` already depends on `undici` 8, which requires 22.19.0.

WebSocket clients no longer use the `ws` package. `NodeSocket.layerWebSocketConstructor` and `NodeSocket.layerWebSocket` always use Node's global `WebSocket`, and pass handshake headers and subprotocols to it as `WebSocketInit`. Importing only client APIs from `NodeSocket` no longer bundles `ws`.

**Breaking:** `ws` moved out of `NodeSocket` into a new `NodeWS` module.

- `NodeSocket.NodeWS` (also re-exported as `BunSocket.NodeWS`) is removed. Use `NodeWS` from `@effect/platform-node/NodeWS` or `@effect/platform-node-shared/NodeWS`, which re-exports `ws` with the same members: `NodeSocket.NodeWS.WebSocketServer` becomes `NodeWS.WebSocketServer`. On Bun, import `ws` directly. The `ws` default export is not re-exported; use `NodeWS.WebSocket` instead of `NodeSocket.NodeWS.default`.
- `NodeSocket.layerWebSocketConstructorWS` is removed. Use `NodeWS.layerWebSocketConstructor`.

**Behaviour changes** for clients that passed handshake headers, which used `ws` before and now use the global `WebSocket`:

- Node's `WebSocket` cannot pause reads. Incoming frames are buffered without limit by default, and a configured `highWaterMark` now fails the socket with a `SocketReadError` instead of pausing reads at 64 KiB. Use `NodeWS.layerWebSocketConstructor` to keep pausing.
- Connection errors are reported as a generic `ErrorEvent` without the underlying error code, so `SocketOpenError` causes carry less detail.
- The `Socket.WebSocket` service holds a global `WebSocket` instance, so `instanceof` checks against `ws` and `ws`-only methods such as `terminate()` and `ping()` no longer apply.
- A `Host` header is ignored; the handshake always sends the URL's host. Use `NodeWS.layerWebSocketConstructor` to set a custom `Host`, for example for virtual-host routing.
- Outgoing messages are not compressed. Incoming messages are still decompressed when the server uses `permessage-deflate`. Use `NodeWS.layerWebSocketConstructor` if outbound compression matters.
- Connections go through undici's global dispatcher instead of `http.globalAgent` / `https.globalAgent`.
