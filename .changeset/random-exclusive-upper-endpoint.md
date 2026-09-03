---
"effect": patch
---

Fix `Random.nextBetween(min, max)` returning the excluded `max` due to floating-point rounding when `min < max`, both bounds are finite, and `max - min` is finite. These results now return the nearest representable number below `max`, still using exactly one random draw.

Degenerate or unsupported inputs retain the existing formula behavior. This correction does not introduce a general invalid-input or overflow policy.
