---
"effect": patch
---

Remove redundant work in the fiber runtime: `Cause.combine` no longer re-compares its result with `Equal.equals`, `runSync` and Standard Schema validation build their sync scheduler once instead of per call, filtered `onExit`/`onError`/`onInterrupt` finalizers and `awaitAllChildren` skip the no-op step when there is nothing to run, and fibers no longer clear their already-empty stack on exit.
