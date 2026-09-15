---
"effect": patch
---

Preserve literal action suffixes such as `/operations/:id:wait` in `HttpApiClient` requests, URL builders, `HttpApiBuilder` server routes, and generated OpenAPI paths. Declared encoded parameter names identify placeholders, so `id` is substituted and decoded while `:wait` remains literal. Schemas whose encoded keys cannot be enumerated retain the existing path interpretation.
