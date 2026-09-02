---
"effect": patch
---

Fix `Stream.rechunk` throwing for large source chunks when the target chunk size is larger, preserving all elements in order.
