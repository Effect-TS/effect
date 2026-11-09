---
"effect": minor
---

`Cookies` now identifies cookies by name, domain and path, so `HttpClientResponse.cookies`, `HttpClient.withCookiesRef` and `HttpServerResponse` keep same-name cookies set for a different domain or path.

- `Cookies.cookies` and the `Schema.Cookies` isomorphic encoding are now a `ReadonlyArray<Cookie>` in the order cookies were last set. Replace `cookies.cookies[name]` with `Cookies.get` or `Cookies.getValue`.
- On `cookies.cookies`, `in` and `Object.hasOwn` check array properties rather than cookie names, while `Object.keys` and `Object.entries` enumerate array indices rather than names. Use `Option.isSome(Cookies.get(cookies, name))` for name-based membership, or enumerate `Cookies.toRecord(cookies)` for names and decoded string values (the last cookie set for each name).
- `Cookies` constructors and combinators that add a cookie, and the `HttpServerResponse` cookie helpers, replace an existing cookie only when its name, domain and path match. Pass the same `domain` and `path` to override or expire a cookie.
