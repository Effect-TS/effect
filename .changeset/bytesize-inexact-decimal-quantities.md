---
"effect": patch
---

Fix `ByteSize` decimal unit constructors such as `megabytes(2.01)` throwing or returning the wrong byte count, and reject fractional-byte quantities instead of rounding them.
