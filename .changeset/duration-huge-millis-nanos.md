---
"effect": patch
---

Fix `Duration.toNanosUnsafe`, `format` and other conversions throwing for millisecond durations too large to convert to nanoseconds as a number.
