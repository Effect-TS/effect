---
"@effect/openapi-generator": patch
---

Honor `style: "form"` with `explode: false` for query arrays in generated HttpClient clients, so `["a", "b"]` is sent as `?tags=a%2Cb` instead of `?tags=a&tags=b`.
