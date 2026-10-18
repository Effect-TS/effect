---
"@effect/platform-deno": patch
"@effect/platform-bun": patch
---

Return `501 Not Implemented` for unsupported `CONNECT` requests in `DenoHttpServer` and `BunHttpServer` without invoking the application.
