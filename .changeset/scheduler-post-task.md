---
"effect": patch
---

Fibers that yield in browsers use `scheduler.postTask` where available instead of the clamped `setTimeout`, and fiber waits, error handlers, `Effect.fn` with pipeables, data-last `dual` calls and `HashMap` updates run faster.
