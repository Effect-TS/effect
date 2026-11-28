---
"effect": patch
---

Fibers that yield in browsers use `scheduler.postTask` where available instead of the clamped `setTimeout`. `Effect.fn` with pipeables, data-last `dual` calls, `HashMap.set`, `Schema` struct decoding and fiber waits also run faster.
