---
"@effect/platform-deno": patch
"@effect/platform-bun": patch
---

Answer `CONNECT` requests with `501 Not Implemented` in `DenoHttpServer` and `BunHttpServer` before they reach the app. The HTTP server interface has no tunnel API, so a `"*"` route that answered `CONNECT` with a 2xx used to leave an HTTP/1.1 connection open as a dead tunnel.
