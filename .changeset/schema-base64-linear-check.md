---
"effect": patch
---

Fix `Schema.isBase64` and `Schema.isBase64Url` throwing `RangeError: Maximum call stack size exceeded` on large inputs.
