---
"@effect/platform-node": minor
"@effect/platform-node-shared": minor
"@effect/platform-bun": minor
"@effect/opentelemetry": minor
"@effect/docgen": minor
"@effect/ai-openai": patch
---

Node.js 22.19.0 (required by `undici` 8) is now the minimum for `@effect/platform-node`, `@effect/platform-node-shared`, `@effect/opentelemetry` and `@effect/docgen`, up from 18.

`NodeSocket` WebSocket clients now use Node's global `WebSocket` instead of `ws`, so client-only usage no longer bundles `ws`.

**Breaking:** `ws` moved to a new `NodeWS` module.

- `NodeSocket.NodeWS` and `BunSocket.NodeWS` are removed. Import `NodeWS` from `@effect/platform-node` or `@effect/platform-node-shared` (on Bun, import `ws` directly). Use `NodeWS.WebSocket` in place of `NodeSocket.NodeWS.default`.
- `NodeSocket.layerWebSocketConstructorWS` is removed. Use `NodeWS.layerWebSocketConstructor`.

**Behaviour changes** for clients that pass handshake headers, which previously used `ws`. Use `NodeWS.layerWebSocketConstructor` to keep the old behaviour:

- Reads cannot be paused. Incoming frames are buffered without limit, and a configured `highWaterMark` fails the socket with a `SocketReadError`.
- Connection errors are a generic `ErrorEvent`, so `SocketOpenError` causes lack the underlying error code.
- The `Socket.WebSocket` service is a global `WebSocket`, so `ws` `instanceof` checks and `ws`-only methods such as `terminate()` and `ping()` no longer apply.
- A custom `Host` header is ignored.
- Outgoing messages are not compressed. Incoming `permessage-deflate` messages are still decompressed.
- Connections use undici's global dispatcher instead of `http.globalAgent` / `https.globalAgent`.
