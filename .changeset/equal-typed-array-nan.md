---
"effect": patch
---

Fix `Equal.equals` to treat matching `NaN` elements in floating-point typed arrays as equal, consistent with ordinary arrays. This also allows `HashSet` lookups using equivalent copies of these typed arrays.
