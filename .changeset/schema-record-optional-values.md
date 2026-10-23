---
"effect": patch
---

`Schema.Record` now consistently rejects optional index-signature values created with `Schema.optionalKey` or `Schema.optional`. Use `Schema.UndefinedOr` to allow `undefined` values.
