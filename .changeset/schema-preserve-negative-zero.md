---
"effect": patch
---

Encode negative zero as `"-0"` instead of `"0"` in `Schema.NumberFromString`, `Schema.FiniteFromString`, and numeric encodings derived with `Schema.toCodecStringTree`.
