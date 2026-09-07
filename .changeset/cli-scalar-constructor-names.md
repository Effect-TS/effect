---
"effect": patch
---

Align CLI scalar constructor names with Schema and Config. In `Primitive`, `Param`, `Flag`, and `Argument`, replace `string` with `String`, `boolean` with `Boolean`, `float` with `Finite`, `integer` with `Int`, `date` with `Date`, and `redacted` with `Redacted` wherever those constructors exist. `Argument` has no boolean constructor.

For example, use `Flag.Int("port")` and `Argument.Finite("ratio")`. Parsing behavior, primitive tags, help labels, and CLI-specific constructors are unchanged.
