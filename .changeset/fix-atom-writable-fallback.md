---
"effect": patch
---

Fix writes through `Atom.withFallback` updating the wrapper instead of the primary atom. Writes now preserve the primary atom's custom write behavior and continue to show the waiting fallback when the primary returns to its initial state.
