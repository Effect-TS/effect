---
"effect": patch
---

Fix `fromSchemaDraft2020_12` (and its callers `fromSchemaDraft07` / `fromSchemaOpenApi3_1`) incorrectly converting a boolean schema `false` into an empty object schema `{}`.

Before this fix, passing a boolean schema `false` to `fromSchemaDraft2020_12` caused it to be silently converted to `{}` because of object rest destructuring applied to a boolean value. This means an unsatisfiable schema (one that should reject all inputs) was treated as if it matched everything.
