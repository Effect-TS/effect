---
"effect": patch
---

Bound `BigDecimal` scales to prevent resource exhaustion.

`BigDecimal.fromString`, and therefore `Schema.BigDecimalFromString`, now rejects input whose scale exceeds ±10,000, such as `"1e300000000"`. The bound also applies to the scale after trailing zeros are removed, so `"10e10000"` is rejected, which keeps every accepted value decodable from its own `format` output. Plain decimal strings are limited too: more than 10,000 fractional digits are rejected, including redundant trailing zeros. `BigDecimal.fromStringUnsafe` throws for these inputs.

Operations that align scales, including `sum`, `subtract`, `remainder`, `scale`, `round`, `truncate`, `ceil` and `floor`, throw a `RangeError` when the alignment would exceed 20,000 digits. Any two parsed values can be aligned, but a chain of arithmetic can still exceed the limit. Operations that need no alignment, such as adding zero, are unaffected, and `round` now returns a value unchanged when its scale is already at or below the target scale.
