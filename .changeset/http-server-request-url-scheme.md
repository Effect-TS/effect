---
"effect": patch
---

Report the real scheme from `HttpServerRequest.toURL`. It uses `x-forwarded-proto` when that is exactly `http` or `https`, and otherwise reads the scheme of `originalUrl`, so HTTP/1.1 over TLS now gives `https` on Deno and Bun (and on Node, together with the `@effect/platform-node` change). This also fixes `url.scheme` in `HttpMiddleware.tracer`.
