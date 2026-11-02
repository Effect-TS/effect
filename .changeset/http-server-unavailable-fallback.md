---
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Answer `503 Service Unavailable` with `Cache-Control: no-store` and `Retry-After: 1`, instead of `404`, when `BunHttpServer` or `DenoHttpServer` receives a request while no app is being served.
