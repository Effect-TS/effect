---
"effect": patch
---

Fix `MutableList.prependAll` and `MutableList.prependAllUnsafe` with nonempty batches on an empty list so subsequent `append` calls preserve the prepended values and `appendAll` calls do not throw.
