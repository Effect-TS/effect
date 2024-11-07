---
"effect": patch
---

Added scientific notation for BigDecimal formatting and string parsing.

Values with a lot of decimal places or trailing zeroes are now formatted in
scientific notation. Previously, extremely large or small values could cause
`OutOfMemory` errors when formatting.
