---
"effect": patch
---

Fix `Toolkit.handle` dropping or reclassifying reasons when a tool handler fails with a composed cause. Every failure, defect and interruption now propagates with its annotations. In `"return"` failure mode, a single typed failure is still returned as the tool result, and `Tool.HandlerError` now includes the tool's failure type.
