---
"@effect/platform-bun": minor
---

`BunHttpServer` now leaves Bun's `idleTimeout` disabled unless set, so quiet response streams and slow uploads are no longer cut after 10 seconds. Directly exposed servers should set `idleTimeout` explicitly to keep Bun closing idle keep-alive connections.
