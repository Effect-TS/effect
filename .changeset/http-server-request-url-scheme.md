---
"effect": patch
"@effect/platform-node": patch
---

- Fix HTTPS detection in `HttpServerRequest.toURL` and tracing. An exact `http` or `https` in `x-forwarded-proto` takes precedence; otherwise, infer HTTPS from `originalUrl`. Paths starting with `//` preserve the request host.
- Node server requests now expose an absolute `originalUrl` when a Host header is present, fixing `HttpMiddleware.searchParamsParser`. Use `url` instead of `originalUrl` to read the path. Hostless requests are unchanged.
- For absolute-form Node requests, derive `url` and `headers.host` from the request target, ignoring a conflicting Host header.
