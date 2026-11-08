---
"effect": patch
---

Fix `Cookies.fromSetCookie`, and with it `HttpClientResponse.cookies` and `HttpClient.withCookiesRef`, dropping same-name cookies set for a different domain or path.
