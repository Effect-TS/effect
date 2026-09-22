---
"effect": patch
---

Fix `Chunk.makeEquivalence` skipping the holes of a chunk over a sparse array, which made it asymmetric. Remove redundant copies and per-element allocations from `Chunk` combinators and `Array.dedupeWith`, and build `Chunk.flatMap`'s result from O(n) concatenation nodes instead of O(n log n).
