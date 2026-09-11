---
"@effect/platform-bun": patch
---

Fix `BunHttpServer` startup when `hostname` is omitted or `undefined` by explicitly passing the default `0.0.0.0` listen address to Bun.
