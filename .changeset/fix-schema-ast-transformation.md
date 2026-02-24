---
"effect": patch
---

Schema: fix `getPropertySignatures` crash on Struct with `optionalWith({ default })` and other Transformation-producing variants

`SchemaAST.getPropertyKeyIndexedAccess` now handles `Transformation` AST nodes by delegating to `ast.to`, matching the existing behavior of `getPropertyKeys`. Previously, calling `getPropertySignatures` on a `Schema.Struct` containing `Schema.optionalWith` with `{ default }`, `{ as: "Option" }`, `{ nullable: true }`, or similar options would throw `"Unsupported schema (Transformation)"`.
