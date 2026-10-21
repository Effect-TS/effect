---
"effect": patch
---

Match finite number strings in linear time. `Schema.isStringFinite`, `Number` record keys, `Number` template literal parts and `Schema.toCodecStringTree` number fields no longer take quadratic time to reject long digit runs such as `"111…x"`. The JSON Schema `pattern` for these schemas changes to the same linear regular expression and accepts exactly the same strings.
