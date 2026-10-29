---
"@effect/platform-node": patch
---

Raise the `redis` peer dependency minimum to 5.1.0. `NodeRedis` imports `SocketTimeoutError`, which `redis` 5.0.x does not export, so it failed to load under native ESM with those versions.
