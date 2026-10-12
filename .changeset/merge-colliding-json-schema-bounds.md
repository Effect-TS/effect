---
"effect": patch
---

Merge colliding inclusive bounds when exporting JSON Schema. A `minimum` or `maximum` that collides with one already on the schema is now tightened in place instead of being moved into `allOf`, so `Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))` exports `minimum: 1, maximum: 100` and `Schema.Natural` exports `minimum: 0`. Annotations on those checks stay at the top level too. Other collisions still use `allOf`.
