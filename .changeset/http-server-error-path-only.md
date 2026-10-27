---
"effect": patch
---

Omit the query string and hash from `HttpServerError` messages, so query values can't leak into span errors or logs. The full request is still available on the error.
