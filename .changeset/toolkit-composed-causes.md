---
"effect": patch
---

Preserve every reason and its annotations when a tool handler fails with a composed cause. Return mode still returns single typed failures as results; its `HandlerError` now includes declared failures because composed causes propagate in both modes.
