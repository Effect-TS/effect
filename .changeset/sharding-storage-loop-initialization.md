---
"effect": patch
---

Fix cluster Sharding startup accessing storage-loop state before initialization, preventing a scheduler-dependent ReferenceError and delayed initial storage reads.
