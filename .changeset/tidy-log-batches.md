---
"effect": patch
---

Fix `Logger.batched` shutdown to finish in-flight output before flushing remaining entries, without overlapping flushes.
