---
"effect": patch
---

Avoid copying the base map twice when `Context.add` rebases an overlay chain, without flattening and caching the parent context as a side effect.
