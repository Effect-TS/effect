---
"effect": patch
---

Fix `HttpMiddleware.cors` omitting the `Access-Control-Max-Age` header when `maxAge` is `0`.
