---
"effect": patch
---

Merge effect and finalizer failure causes instead of dropping the original cause. `Effect.onExitPrimitive` now folds a failing finalizer's cause into the original failure cause, so `Effect.onExit`, `Effect.ensuring`, `Effect.onError`, `Effect.acquireUseRelease`, scoped resources, and Channel bracket cleanup all inherit the merge. The `Pull` done filters treat a `Cause.Done` signal merged with other failures as a real failure, stripping the done signal from the cause.
