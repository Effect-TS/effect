---
"effect": patch
---

Merge every colliding bound when exporting JSON Schema. A lower bound (`minimum`, `exclusiveMinimum`, `minLength`, `minItems`, `minProperties`) or upper bound (`maximum`, `exclusiveMaximum`, `maxLength`, `maxItems`, `maxProperties`) that collides with one already on the schema is now tightened in place instead of being moved into `allOf`. For example, `Schema.NonEmptyArray(Schema.String).check(Schema.isMinLength(2))` exports `minItems: 2` instead of `minItems: 1` with `allOf: [{ minItems: 2 }]`. Other collisions, such as two `pattern` or `multipleOf` checks, still use `allOf`.
