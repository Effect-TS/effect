---
"effect": patch
---

Improve schema construction performance by removing the unconditional duplicate-property scan from `SchemaAST.Objects`. `Record` deduplicates literal keys, and `StructWithRest` still reports collisions when it combines concrete properties.
