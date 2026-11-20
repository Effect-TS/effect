---
"effect": minor
---

Add `Toolkit.HandlerContext.modelOutput` so tool handlers can set the model-facing output for their final result.

Manually constructed `Toolkit.HandlerContext` values must now include `modelOutput` (e.g. `() => Effect.void`).
