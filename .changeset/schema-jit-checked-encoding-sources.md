---
"effect": patch
---

Speed up JIT-compiled Schema decoding of transformations whose source has checks, such as a pattern-checked string decoded to a number, by inlining the source checks instead of falling back to the interpreter for that property.
