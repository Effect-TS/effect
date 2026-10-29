---
"@effect/platform-node": patch
---

Fix `NodeRedis` failing to load under native ESM with `redis` 5.0.x, which does not export `SocketTimeoutError`. The default reconnect strategy now looks up `SocketTimeoutError` only when `redis` exports it, so every version in the `redis` peer range loads and socket timeouts still stop reconnection where the error exists.
