---
"effect": patch
---

Remove unnecessary `===` comparison in `getEquivalence` functions

In some `getEquivalence` functions that use `make`, there is an unnecessary `===` comparison. The `make` function already handles this comparison.
