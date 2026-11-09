---
"effect": patch
---

Redact `HttpClientError` request URLs with the `UrlParams.CurrentRedactedNames` of the fiber that executed the request and of the fiber that created the error, as well as those of the fiber that renders it.
