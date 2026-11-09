---
"effect": patch
---

Fix `Cookies.fromSetCookie` and `Cookies.fromIterable`, and with them `HttpClientResponse.cookies` and `HttpClient.withCookiesRef`, dropping same-name cookies set for a different domain or path. `Cookies.all` lists every cookie in order, while `cookies` keeps the last one per key.
