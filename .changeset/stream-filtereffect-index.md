---
"effect": patch
---

Fix `Stream.filterEffect` passing chunk-relative indices to its predicate. The index now counts elements across the whole stream, like `Stream.map` and `Stream.mapEffect`.
