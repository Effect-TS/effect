---
"effect": patch
---

Fibers that yield in browsers use `scheduler.postTask` where available instead of the clamped `setTimeout`. `Effect.fn` with pipeables, `catchTag` and the other error handlers, data-last `dual` calls, `HashMap` updates, generator returns, fork/join, and fiber and `Pool` waits also run faster.
