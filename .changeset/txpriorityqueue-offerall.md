---
"effect": patch
---

`TxPriorityQueue.offerAll` merges new values into the sorted queue instead of re-sorting existing values. Insertions use binary search and avoid an extra queue copy.
