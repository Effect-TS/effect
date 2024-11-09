---
"effect": minor
---

Added `BigDecimal.unsafeFromNumber` and `BigDecimal.safeFromNumber`.

Deprecated `BigDecimal.fromNumber` in favour of `BigDecimal.unsafeFromNumber`.

The current implementation of `BigDecimal.fromNumber` and `BigDecimal.unsafeFromNumber` now throws
a `RangeError` for numbers that are not finite such as `NaN`, `+Infinity` or `-Infinity`.
