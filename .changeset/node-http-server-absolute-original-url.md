---
"@effect/platform-node": patch
---

Make `originalUrl` on Node server requests an absolute URL, as Deno, Bun and `HttpServerRequest.fromWeb` already do. It is built from the connection's TLS state and the `host` header (for example `https://example.test/x?y=1` instead of `/x?y=1`), and it stays the bare path when there is no `host`. Code that reads `originalUrl` as a path must now read `url` instead. As a result, `HttpServerRequest.toURL` reports `https` over TLS and `HttpMiddleware.searchParamsParser` no longer throws.

For an absolute-form request (`GET http://abs.test/x`), the `host` header now carries the request-target's authority and `url` is the origin-form path, as RFC 9112 §3.2.2 requires.
