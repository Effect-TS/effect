---
"effect": patch
---

Keep every exchange of an `HttpClient.withScope` client tied to its scope.

Redirects followed by `HttpClient.followRedirects` and requests rewritten by `HttpClient.withCookiesRef` are now aborted when the owning scope closes, in either middleware order. Ownership is tracked per execution, so concurrent executions of the same request no longer share an abort controller, and requests made by other clients from middleware keep their usual interruption cleanup.
