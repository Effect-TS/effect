---
"effect": patch
---

Fix asymmetric `Chunk.makeEquivalence` comparisons on sparse arrays. Avoid redundant copies in `Chunk` and `Array.dedupeWith`, and balance `Chunk.flatMap` concatenations.
