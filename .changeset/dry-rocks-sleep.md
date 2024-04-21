---
"@effect/schema": patch
---

remove non-tree-shakable compiler dependencies from the Schema module:

- remove dependency from `Arbitrary` compiler
- remove dependency from `Equivalence` compiler
- remove dependency from `Pretty` compiler
