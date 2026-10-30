---
"effect": patch
---

Limit `BigDecimal` scales to prevent resource exhaustion.

- `BigDecimal.fromString` and `Schema.BigDecimalFromString` reject strings whose scale, before or after removing trailing zeros, is outside ±10,000, such as `"1e300000000"`, `"10e10000"` or more than 10,000 fractional digits. `BigDecimal.fromStringUnsafe` throws for them.
- Operations that align scales (`sum`, `subtract`, `remainder`, `scale`, `round`, `truncate`, `ceil`, `floor`) throw a `RangeError` when the scales differ by more than 20,000.
- `round` returns values already at or below the target scale unchanged.
