---
"effect": minor
---

Add a `maxDepth` option to `Context.makeUnsafe`, controlling how many `Context.add` calls are kept as overlays before the context is rebased into a flat map. Defaults to 8.
