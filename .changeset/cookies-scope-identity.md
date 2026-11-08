---
"effect": minor
---

`Cookies` now identifies cookies by name, domain and path, so same-name `Set-Cookie` values with different scopes are no longer dropped.

- `Cookies.cookies` is now a `ReadonlyArray<Cookie>` in insertion order instead of a record keyed by name. Read values with `Cookies.get`, `Cookies.getValue` or `Cookies.toRecord` (last cookie with a name wins) rather than indexing the record.
- The `Schema.Cookies` isomorphic encoding is now an array of cookies; its JSON encoding is unchanged.
- `setCookie`, `set`, `expireCookie` and `merge` replace only the cookie with the same name, domain and path. For example `HttpServerResponse.expireCookie("session")` after `setCookie("session", value, { path: "/" })` now emits both headers; pass `{ path: "/" }` to expire that cookie. `remove(name)` still removes every cookie with that name.
