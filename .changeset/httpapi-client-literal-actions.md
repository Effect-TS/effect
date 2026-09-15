---
"effect": patch
---

Preserve literal action suffixes such as `/operations/:id:wait` in `HttpApiClient` requests, URL builders, `HttpApiBuilder` server routes, and generated OpenAPI paths. Declared encoded parameter names identify placeholders, so `id` is substituted and decoded while `:wait` remains literal. Schemas whose encoded keys cannot be enumerated retain the existing path interpretation.

Clients and OpenAPI paths treat colon-prefixed names as literal when no params schema is supplied. Server routes preserve their existing parameter matching in that case for raw handlers and middleware using `HttpRouter.RouteContext`. With a declared schema, all three surfaces recognize placeholder names using ASCII letters, digits, and underscores.
