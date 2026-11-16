---
"effect": patch
---

Fix `HttpServerResponse.setStatus`, `removeHeader` and the cookie combinators resetting explicit `content-type` and `content-length` headers to the body's values.
