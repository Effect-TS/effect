---
"effect": patch
---

Fix distinct `Deferred`, `FiberHandle`, `FiberSet`, `FiberMap` and `RcRef` instances comparing `Equal` and sharing a `HashSet` or `HashMap` key. They now compare by reference, as `MutableRef` and `Ref` do, so an `Equal.equals` result between two of them also no longer stays cached after one changes.
