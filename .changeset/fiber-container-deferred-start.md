---
"effect": patch
---

Honor `startImmediately: false` in `FiberMap.run`, `FiberSet.run`, and `FiberHandle.run` while preserving container ownership and immediate startup when the option is omitted.
