---
"effect": patch
---

Redact `HttpClientError` request URLs with the `UrlParams.CurrentRedactedNames` active when the error is created, and for transport errors also with those of the request fiber, rather than those of the fiber that later renders it.
