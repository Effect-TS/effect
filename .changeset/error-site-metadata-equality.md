---
"effect": patch
---

Fix `Equal.equals` and `Hash.hash` treating otherwise identical `Error` values as different on Bun when they were constructed at different source locations.
