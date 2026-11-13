---
"@effect/openapi-generator": patch
---

Fix generated HTTP client path parameter types and serialization according to OpenAPI `style` and `explode`.

When regenerating clients, pass numeric, boolean, and array path arguments directly instead of converting them to strings.
