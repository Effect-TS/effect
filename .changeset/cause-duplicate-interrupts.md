---
"effect": patch
---

Fix duplicate interrupt reasons when interrupting a fiber inside `Effect.withSpan` or `Effect.fn`.
