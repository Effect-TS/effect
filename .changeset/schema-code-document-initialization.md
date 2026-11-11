---
"effect": patch
"@effect/openapi-generator": patch
---

Fix generated schema initialization when recursive and non-recursive definitions depend on each other in `SchemaRepresentation.toCodeDocument` and the OpenAPI generator.
