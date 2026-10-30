---
"effect": patch
---

Bound `BigDecimal` scales to prevent resource exhaustion. `BigDecimal.fromString` (and therefore `Schema.BigDecimalFromString`) now rejects input whose scale exceeds ±10,000, such as `"1e300000000"`. Operations that align scales, including `sum`, `subtract`, `remainder`, `scale`, `round`, `truncate`, `ceil` and `floor`, throw a `RangeError` when the alignment would exceed 10,000 digits. Operations that need no alignment, such as adding zero, are unaffected.
