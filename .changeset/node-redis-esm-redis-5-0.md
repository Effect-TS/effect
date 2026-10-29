---
"@effect/platform-node": patch
---

Fix `NodeRedis` failing to load under native ESM with `redis` 5.0.x, which does not export `SocketTimeoutError`. The default reconnect strategy now recognizes socket timeouts by error name, so every version in the `redis` peer range is supported.
