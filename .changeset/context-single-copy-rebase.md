---
"effect": patch
---

Copy the base map once instead of twice when `Context.add` rebases an overlay chain, and copy Maps via a `for...of` loop instead of `new Map(otherMap)`, which measures faster on Node 22.
