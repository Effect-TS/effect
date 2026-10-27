---
"effect": patch
---

Redact `HttpClientError` request URLs with the `UrlParams.CurrentRedactedNames` active when the error is created, rather than those of the fiber that later renders it.
