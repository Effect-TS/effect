---
"@effect/schema": patch
---

Optimize JSON Schema output for homogeneous tuples (such as non empty arrays).

This change corrects the JSON Schema generation for `S.NonEmptyArray` to eliminate redundant schema definitions. Previously, the element schema was unnecessarily duplicated under both `items` and `additionalItems`.
