---
"effect": patch
---

Validate `Schema.isBase64` and `Schema.isBase64Url` in linear time. They no longer throw `RangeError: Maximum call stack size exceeded` on multi-megabyte inputs; accepted strings and JSON Schema output are unchanged.
