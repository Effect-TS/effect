---
"effect": minor
---

`Cookies` now identifies cookies by name, domain and path, so `HttpClientResponse.cookies`, `HttpClient.withCookiesRef` and `HttpServerResponse` keep same-name cookies set for a different domain or path instead of replacing them.

- Every `Cookies` constructor and combinator that adds a cookie, and the `HttpServerResponse` cookie helpers, replace an existing cookie only when its name, domain and path match. Pass the same `domain` and `path` to override or expire a cookie.
- Keys of `Cookies.cookies`, including the `Schema.Cookies` isomorphic encoding, are no longer always cookie names when a name has several cookies, and `Object.values(cookies.cookies)` does not list them in the order they were set. Use `get`, `toRecord` or `toSetCookieHeaders` instead.
