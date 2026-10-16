---
"@effect/platform-node": patch
---

`originalUrl` on Node server requests is now an absolute URL, as on Deno, Bun and `HttpServerRequest.fromWeb`. It is built from the socket's TLS state and the `host` header (`https://example.test/x?y=1` instead of `/x?y=1`), and stays a bare path when there is no `host`. Code that reads `originalUrl` as a path should read `url` instead. With this, `HttpServerRequest.toURL` reports `https` over TLS and `HttpMiddleware.searchParamsParser` no longer throws.

For absolute-form requests (`GET http://abs.test/x`), `url` is now the path and the `host` header is the target's authority, as RFC 9112 §3.2.2 requires.
