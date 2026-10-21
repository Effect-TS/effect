---
"effect": patch
---

Fix `Iterable.dedupeAdjacent` and `Iterable.dedupeAdjacentWith` overflowing the stack on long runs of equal elements.
