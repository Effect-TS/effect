---
"effect": patch
---

Reduce the core Effect runtime bundle by removing eager Equal and Hash protocol implementations from Cause, Exit, and Context.

`Cause.combine` now deduplicates `Fail` and `Die` reasons by `error` or `defect` identity when their annotation maps are also identical. Other reasons use wrapper identity or an explicitly implemented Equal protocol.
