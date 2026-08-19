---
"effect": patch
---

Merge effect and finalizer failure causes instead of dropping the original cause. This applies to `Effect.onExit`, `Effect.ensuring`, `Effect.onError` and everything built on them, including `Effect.acquireUseRelease`, scoped resources, and Channel bracket cleanup. The low-level `Effect.onExitPrimitive` keeps its replace semantics.
