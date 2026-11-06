---
"effect": patch
---

Prevent built-in prototype methods from being mistaken for user-supplied `Schema.Struct` field values. For example, `Schema.Struct({ toString: Schema.optionalKey(Schema.String) })` now accepts `{}` instead of failing because the inherited `toString` function is not a string.

Declared fields whose names are owned by `Object.prototype` now require an own property, even on inputs with custom prototypes. This lets absent optional fields stay absent and decoding defaults run; missing required fields report a missing key. Other field names retain inherited-property support.
