---
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

`BunHttpServer` and `DenoHttpServer` now return `503 Service Unavailable` instead of `404` while no app is served, with `Cache-Control: no-store` and an advisory `Retry-After: 1`.
