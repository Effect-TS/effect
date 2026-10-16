---
"effect": patch
---

`HttpServerRequest.toURL` now reports the request's real scheme. It uses `x-forwarded-proto` when that is exactly `http` or `https`, and otherwise the scheme of `originalUrl`, so HTTP/1.1 over TLS gives `https` on Deno and Bun (and on Node with the `@effect/platform-node` change). This also fixes `url.scheme` in `HttpMiddleware.tracer`. A request path starting with `//` now resolves against the request host instead of being read as a different host.
