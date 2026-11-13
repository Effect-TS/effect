---
"effect": patch
---

Fix `HttpServerResponse.setStatus`, the cookie setters and `removeHeader` resetting an explicit `content-type` or `content-length` to the body's values.
