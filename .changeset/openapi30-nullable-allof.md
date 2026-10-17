---
"effect": patch
---

Support the nullable single-member `allOf` tooling convention in `JsonSchema.fromSchemaOpenApi3_0` when no string `type` or `anyOf` is present. Sibling constraints are preserved and may still reject null.
