---
"effect": patch
---

Format `HttpServerError` messages with only the request path, so query values and URL credentials can't leak into span errors or logs. The full request is still available on the error.
