---
"effect": patch
---

Improve schema construction performance by removing the unconditional duplicate-property scan from `SchemaAST.Objects` and avoiding temporary arrays when AST projections leave their elements unchanged. `Record` deduplicates literal keys, and `StructWithRest` still reports collisions when it combines concrete properties.
