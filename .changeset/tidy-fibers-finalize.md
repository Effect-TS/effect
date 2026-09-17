---
"effect": patch
---

Preserve the closing fiber's interruption cause when `Effect.addFinalizer` replays the acquiring fiber's FiberRefs. This prevents interrupted acquisition from causing an uninterrupted scope closure to fail, including resources registered through `Effect.acquireRelease`.
