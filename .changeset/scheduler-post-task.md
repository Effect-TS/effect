---
"effect": patch
---

Fibers that yield in browsers use `scheduler.postTask` where available instead of the clamped `setTimeout`. `Effect.gen`, `Effect.fn` with pipeables, error handlers, `onExit`, data-last `dual` calls, `HashMap` lookups and updates, `Queue.offer`, Schema struct decoding and fiber waits also run faster.
