---
"effect": patch
---

Match finite number strings in linear time. `Schema.isStringFinite`, `Number` record keys, `Number` template literal parts and `Number` fields of `Schema.toCodecStringTree` codecs no longer take quadratic time to reject long digit runs such as `"111…x"`; accepted strings and JSON Schema output are unchanged.
