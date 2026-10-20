---
"effect": patch
---

Match finite number strings in linear time. `Schema.isStringFinite`, `Number` record keys, `Number` template literal parts and `Number` fields of `Schema.toCodecStringTree` codecs no longer take quadratic time to reject long digit runs such as `"111…x"`. The JSON Schema `pattern` emitted for these schemas uses the same linear regular expression; it accepts exactly the same strings as before.
