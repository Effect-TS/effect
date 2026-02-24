---
"effect": patch
---

Schema: fix `Schema.omit` producing wrong result on Struct with `optionalWith({ default })` and index signatures

`getIndexSignatures` now handles `Transformation` AST nodes by delegating to `ast.to`, matching the existing behavior of `getPropertyKeys` and `getPropertyKeyIndexedAccess`. Previously, `Schema.omit` on a struct combining `Schema.optionalWith` (with `{ default }`, `{ as: "Option" }`, etc.) and `Schema.Record` would silently take the wrong code path, returning a Transformation with property signatures instead of a TypeLiteral with index signatures.
