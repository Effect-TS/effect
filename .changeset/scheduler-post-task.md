---
"effect": patch
---

Fibers that yield in browsers use `scheduler.postTask` when available instead of clamped `setTimeout`, reporting uncaught task errors via `reportError` with a `setTimeout` fallback. Fiber execution, `Effect.scoped`, `Pool`, `Queue`, `HashMap`, `Function.dual`, and `Schema` struct/array decoding also reduce per-operation overhead and bundle size.
