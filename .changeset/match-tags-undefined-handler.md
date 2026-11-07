---
"effect": patch
---

Fix `Match.tags` and `Match.discriminators` throwing on an input whose handler is explicitly `undefined` instead of leaving it for later cases.
