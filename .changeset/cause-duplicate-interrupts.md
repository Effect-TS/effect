---
"effect": patch
---

Fix interrupting a fiber inside `Effect.withSpan` or `Effect.fn` repeating the same interrupt reason in its `Cause` and `Cause.pretty` output.
