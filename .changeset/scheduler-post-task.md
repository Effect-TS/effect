---
"effect": patch
---

Use `scheduler.postTask` in browsers where available instead of clamped `setTimeout`, and reduce overhead in `FiberImpl`, `Context`, `Pool`, `Queue`, `HashMap`, `Schema`, `Function.dual`, and `Pipeable.pipeArguments`.
