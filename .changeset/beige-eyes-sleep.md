---
"@effect/schema": patch
---

Fix return types for `attachPropertySignature` function.

This commit addresses an inconsistency in the return types between the curried and non-curried versions of the `attachPropertySignature` function. Previously, the curried version returned a `Schema`, while the non-curried version returned a `SchemaClass`.
