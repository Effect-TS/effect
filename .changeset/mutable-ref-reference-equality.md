---
"effect": patch
---

Fix distinct `MutableRef` and `Ref` instances comparing `Equal` and colliding in `HashSet` and `HashMap` keys when their contents match.
