---
"@effect/platform-node": patch
"@effect/platform-deno": patch
---

Take the `host` request header from the HTTP/2 `:authority` (RFC 9113 §8.3.1), so `HttpServerRequest.toURL` and URL span attributes no longer fall back to `localhost` or follow a conflicting `host` header for HTTP/2 requests.
