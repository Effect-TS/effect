---
"effect": patch
---

Speed up Schema JIT and AOT decoding for built-in primitive conversions, including `Schema.toCodecStringTree` structs with numbers, booleans, literals and numeric enums. User transformations, user checks on encoded values and non-primitive sources retain interpreter fallback.
