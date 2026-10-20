---
"effect": minor
---

`HttpClient.withCookiesRef` now takes a `Ref<ReadonlyArray<Cookie>>` and sends stored response cookies only to a matching host, path and scheme, using the new `Cookies.storeFromResponse` and `Cookies.toRequestCookieHeader`. Seed the ref with `Cookies.storeFromResponse` or with cookies that set a `domain`.
