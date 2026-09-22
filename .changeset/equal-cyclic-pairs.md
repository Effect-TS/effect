---
"effect": patch
---

Fix `Equal.equals` on cyclic values: it now compares them pair by pair, no longer depends on earlier comparisons, and recovers after a custom `Equal` throws. `null`, `undefined`, booleans and symbols no longer hash like their names, and `HashMap`, `HashSet`, `Chunk` and `Trie` hash incrementally, so their hash values change.
