---
"effect": patch
---

Fix `HttpClient.withCookiesRef` applied before `followRedirects` so cookies set by redirect responses are sent on subsequent same-origin hops. Cookie refs are not reapplied after a cross-origin redirect.
