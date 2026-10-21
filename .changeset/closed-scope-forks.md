---
"effect": patch
---

Prevent `Effect.forkIn` and `Effect.forkScoped` from running work in an already-closed scope, even when `startImmediately` or `uninterruptible` is enabled. They now return an interrupted fiber without executing the supplied effect.
