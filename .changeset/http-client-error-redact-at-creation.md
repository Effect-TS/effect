---
"effect": patch
---

Redact `HttpClientError` request URLs with the `UrlParams.CurrentRedactedNames` of the fiber that executed the request and of the fiber that created the error, as well as those of the fiber that renders it. To support this, `HttpClient.make` now passes the runner a new copy of the request on every execution, so the runner and `response.request` no longer receive the caller's request object, even when trace propagation is disabled.
