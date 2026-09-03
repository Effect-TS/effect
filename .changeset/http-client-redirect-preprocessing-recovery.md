---
"effect": patch
---

Fix `HttpClient.followRedirects` bypassing response-level error recovery and context provision during request preprocessing, including when the redirect limit is zero. Preprocessing errors recovered by an existing `HttpClient.catch` handler can now continue through enclosing response filters and transforms and follow a recovered redirect response.

Redirects retain the successfully preprocessed request's method and body when a response wrapper substitutes a response associated with another request. When preprocessing fails without producing a request, redirects use the recovered response's request instead. This request state resets for every execution, including repeated runs of the same Effect value.
