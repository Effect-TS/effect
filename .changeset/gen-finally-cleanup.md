---
"effect": patch
---

Fix `Option.gen` and `Result.gen` skipping `finally` blocks and `using` disposal when a yielded `None` or failure short-circuits. A `finally` block that returns now replaces the short-circuit result.
