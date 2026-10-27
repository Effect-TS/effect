---
"effect": patch
---

Redact `HttpClientError` request URLs with the `UrlParams.CurrentRedactedNames` active when the error is created and those of the fiber that executed the request, rather than those of the fiber that later renders it.
