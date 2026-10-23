---
"effect": patch
---

`MutableRef` and `Ref` now compare by reference. Distinct instances with equal contents no longer compare `Equal` or share a `HashSet` or `HashMap` key.
