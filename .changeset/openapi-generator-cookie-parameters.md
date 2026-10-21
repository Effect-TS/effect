---
"@effect/openapi-generator": patch
---

Support non-security cookie parameters in `httpclient` and `httpclient-type-only` output. Cookie parameters are now part of the generated operation params and are sent in the request `Cookie` header. Browsers manage this header themselves, so browser clients should rely on browser-managed cookies. `httpapi` output still drops cookie parameters with a `cookie-parameter-dropped` warning.
