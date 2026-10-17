---
"effect": patch
---

`JsonSchema.fromSchemaOpenApi3_0` now reads `{ nullable: true, allOf: [schema] }` as nullable, the usual OpenAPI 3.0 way to write a nullable `$ref`.
