---
"effect": patch
---

Fix `LayerRef` reusing the previous context after invalidation or refresh while an earlier borrower still holds it.
