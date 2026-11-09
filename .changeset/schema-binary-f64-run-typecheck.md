---
"effect": patch
---

Fix `SchemaBinary` encoding non-number elements of a number array as `NaN` or `0` instead of failing with "Expected a number" when an earlier element needs 64-bit float encoding, such as `"x"` in `[Math.PI, "x"]`.
