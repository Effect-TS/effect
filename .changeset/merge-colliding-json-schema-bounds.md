---
"effect": patch
---

Merge colliding bounds when exporting JSON Schema. A lower bound (`minimum`, `exclusiveMinimum`, `minLength`, `minItems`, `minProperties`) or upper bound (`maximum`, `exclusiveMaximum`, `maxLength`, `maxItems`, `maxProperties`) that collides with one already on the schema is now tightened in place instead of being moved into `allOf`, and annotations on that check stay at the top level. For example, `Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))` exports `minimum: 1, maximum: 100`, `Schema.Natural` exports `minimum: 0`, and `Schema.NonEmptyArray(Schema.String).check(Schema.isMinLength(2))` exports `minItems: 2`. Other collisions, such as two `pattern` or `multipleOf` checks, still use `allOf`.
