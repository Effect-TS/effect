---
"@effect/openapi-generator": minor
---

Generated `httpclient` clients now keep the error and requirement types of the `HttpClient` passed to `make`, so errors and services added by client middleware appear in each operation's signature. The generated interface gains `E` and `R` type parameters that default to `HttpClientError` and `never`, so existing clients are unchanged.
