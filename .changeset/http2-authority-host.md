---
"@effect/platform-node": patch
"@effect/platform-deno": patch
---

Fill in the `host` request header from the HTTP/2 authority when the client did not send one, so `HttpServerRequest.toURL` and URL span attributes no longer fall back to `localhost` for HTTP/2 requests.
