---
"effect": patch
---

Fix `Effect.fromOption` to evaluate a custom `onNone` error factory on each execution rather than during construction. Exceptions thrown by the factory now become runtime defects.
