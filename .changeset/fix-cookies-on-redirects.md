---
"effect": patch
---

Fix `HttpClient.withCookiesRef` composed with `followRedirects`: cookies set by a redirect response are now sent on the following same-origin hops, and the ref's cookies are not reattached after a cross-origin redirect.
