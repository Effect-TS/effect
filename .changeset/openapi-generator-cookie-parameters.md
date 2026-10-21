---
"@effect/openapi-generator": patch
---

Support non-security cookie parameters with primitive schemas in `httpclient` and `httpclient-type-only` output. Cookie parameters are now part of the generated operation params and are sent in the request `Cookie` header. Cookie parameters with structured schemas, such as objects or arrays, are still dropped with a `cookie-parameter-dropped` warning, as are all cookie parameters in `httpapi` output.

The `Cookie` header is subject to the supplied `HttpClient`'s request transformations: browsers ignore explicit values, and `HttpClient.withCookiesRef` replaces the header whenever its cookie jar is non-empty.
