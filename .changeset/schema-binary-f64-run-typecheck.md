---
"effect": patch
---

Fix `SchemaBinary` accepting non-number elements in a number array once it has chosen the f64 encoding. For example, `[Math.PI, Math.E, "x"]` encoded `"x"` as `NaN`, and `null` as `0`, instead of failing with "Expected a number".
