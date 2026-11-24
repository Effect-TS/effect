---
"effect": patch
---

Fix `LayerRef.invalidate`, `LayerRef.refresh` and scheduled refreshes reusing the old context while an earlier borrower still holds it.
