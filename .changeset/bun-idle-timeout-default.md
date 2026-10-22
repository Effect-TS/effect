---
"@effect/platform-bun": minor
---

`BunHttpServer` now disables Bun's 10 second `idleTimeout` unless you set one, so quiet response streams and slow uploads are no longer cut. Directly exposed servers should set `idleTimeout` to keep idle connections closed.
