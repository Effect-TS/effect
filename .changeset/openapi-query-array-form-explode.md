---
"effect": patch
"@effect/openapi-generator": patch
---

Honor `style: "form"` with `explode: false` for query arrays in generated HttpClient clients, so `["a,b", "c"]` is sent as `?tags=a%2Cb,c` instead of `?tags=a%2Cb&tags=c`.

`Url.make` now appends `UrlParams` to an existing query without re-encoding it.
