---
"effect": patch
---

Add `Struct.modifyFields`, a variant of `Struct.evolve` where each per-key function must return the same type as the field it replaces, so the result has exactly the type of the input struct.
