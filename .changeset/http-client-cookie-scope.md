---
"effect": minor
---

Replace `HttpClient.withCookiesRef` with `HttpClient.withCookieJar`, backed by the new `CookieJar` module, so stored response cookies are sent only to a matching host, path and scheme. Migrate by holding a `Ref<CookieJar>` instead of a `Ref<Cookies>`, seeding it with `CookieJar.setFromResponse` where needed.
