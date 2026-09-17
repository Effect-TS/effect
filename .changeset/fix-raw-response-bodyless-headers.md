---
"effect": patch
---

`HttpServerResponse.toWeb` now keeps a raw `Response`'s headers and `Set-Cookie` values when the body is omitted (HEAD, or status 204, 205 or 304). Bodyless outer statuses keep the outer status and status text; HEAD keeps the raw `Response`'s. Outer cookies are appended to native `Set-Cookie` headers instead of replacing them.
