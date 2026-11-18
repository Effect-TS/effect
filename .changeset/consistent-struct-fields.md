---
"effect": patch
---

Fix field discovery and type validation across struct comparisons, schemas, commands, and collection helpers to consistently handle own enumerable string and symbol fields.

Some field maps declared with `interface` are no longer accepted. Replace `interface Fields { ... }` with `type Fields = { ... }`, or pass a plain object copy by replacing `Order.Struct(fields)` with `Order.Struct({ ...fields })`.
