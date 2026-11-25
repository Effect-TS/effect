---
"effect": patch
---

Give `Effect.addFinalizer` and `Effect.acquireRelease` release callbacks their own scope so temporary scoped resources stay alive until cleanup finishes.
