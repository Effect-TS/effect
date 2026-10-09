---
"effect": patch
---

Export `Schema.isInt` and `Schema.Int` as exact JSON Schema integers bounded by `Number.MIN_SAFE_INTEGER` and `Number.MAX_SAFE_INTEGER`. Composed bounds retain the tighter constraint, and exact integer branches preserve `oneOf`.
