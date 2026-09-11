---
"@effect/platform-bun": patch
---

Fix `BunHttpServer` startup when `hostname` is omitted by explicitly listening on `0.0.0.0`, avoiding a `ServeError` when parsing Bun's default hostname.
