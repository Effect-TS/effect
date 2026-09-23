---
"effect": patch
---

Wake STM retry waiters for explicit `TxRef` writes, including equal-value writes, without waking them for reads. Preserve distinct `0` and `-0` values when committing.
