---
"@effect/platform-bun": minor
---

`BunHttpServer` now defaults Bun's `idleTimeout` to `0`, so quiet response streams and slow uploads are no longer cut after 10 seconds. Use `Stream` and `Effect` timeouts to bound them instead. An explicit `idleTimeout` is passed to Bun unchanged. Without one, Bun no longer closes idle keep-alive connections or clients that stop reading, so set `idleTimeout` or use a proxy with its own idle timeout when the server is directly exposed.
