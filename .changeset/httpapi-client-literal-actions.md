---
"effect": patch
---

Preserve literal suffixes such as `:wait` in `/operations/:id:wait` across `HttpApiClient`, `HttpApiBuilder`, and OpenAPI paths.

Server routes without a params schema keep their existing matching for `RouteContext` consumers. Schemas whose keys cannot be enumerated keep the existing fallback.
