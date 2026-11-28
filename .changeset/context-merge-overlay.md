---
"effect": patch
---

`Context.merge` now adds a small right-hand context as overlays instead of copying the whole left-hand map, and no longer flattens the left-hand context to check whether it is empty. This removes a copy of the fiber's service map from every `Effect.provideContext` and `Effect.provide(context)`.
