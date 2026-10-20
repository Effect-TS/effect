---
"effect": patch
---

Add `CookieJar` and replace `HttpClient.withCookiesRef` with `HttpClient.withCookieJar`, so response cookies are only sent to a matching host, path and scheme. `withCookiesRef` is removed because its name-keyed `Ref<Cookies>` sent every cookie to every host.
