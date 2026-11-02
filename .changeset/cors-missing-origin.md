---
"effect": patch
---

Fix `HttpMiddleware.cors` calling the `allowedOrigins` predicate with `undefined` for requests without an `Origin` header.
