---
"effect": patch
---

Fix `Order.clamp` (and module `clamp` wrappers) returning the bound instead of the input value when the input compares equal to a bound.
