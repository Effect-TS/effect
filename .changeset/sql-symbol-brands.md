---
"effect": patch
---

Brand SQL fragments and segments with `Symbol.for` keys. `sql` template values, `Statement.isFragment` and `Statement.isCustom` now only recognize values created by the `Statement` constructors, so plain objects that share a fragment or segment shape are bound as parameters.
