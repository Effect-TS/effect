---
"effect": minor
---

Added `BigDecimal.toExponential` for scientific notation formatting of `BigDecimal` values.

The implementation of `BigDecimal.format` now uses scientific notation for values with
at least 16 decimal places or trailing zeroes. Previously, extremely large or small values
could cause `OutOfMemory` errors when formatting.
