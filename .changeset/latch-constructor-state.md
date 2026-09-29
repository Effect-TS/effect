---
"effect": patch
---

`Latch.make` and `Latch.makeUnsafe` take `"open"` or `"closed"` instead of a boolean. Omit the argument or pass `"closed"` for the previous default, and pass `"open"` where you previously passed `true`.
