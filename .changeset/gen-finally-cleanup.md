---
"effect": patch
---

`Option.gen` and `Result.gen` now close the generator when a yielded value short-circuits, so `finally` and `using` run. A `return` in `finally` replaces that `None` or failure, including `return undefined`.
