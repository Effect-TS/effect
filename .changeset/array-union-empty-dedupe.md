---
"effect": patch
---

Fix `Array.union`, `Array.unionWith` and `Chunk.union` keeping duplicates from the non-empty side when the other input is empty. The `Array.unionWith` equivalence is now typed to receive elements from either input.
