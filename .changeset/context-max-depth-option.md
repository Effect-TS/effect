---
"effect": patch
---

Add an optional `maxDepth` to `Context.makeUnsafe`, letting application code configure how many `Context.add` calls a context tolerates before its overlay chain is rebased into a flat map. The override is inherited by every context derived from it. Defaults to 8, unchanged from before.
