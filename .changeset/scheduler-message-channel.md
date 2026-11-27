---
"effect": patch
---

Fibers that yield in browsers no longer wait for the 4ms nested `setTimeout` clamp, and `Effect.fn` with pipeables, data-last `dual` calls, `HashMap` updates and fiber waits run faster.
