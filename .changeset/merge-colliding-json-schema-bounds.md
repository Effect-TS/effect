---
"effect": patch
---

Tighten colliding bounds in place when exporting JSON Schema, instead of moving them into `allOf`. This applies to numeric, length, item-count and property-count bounds, and an inclusive or exclusive bound implied by the other on the same side is dropped. For example, `Schema.Natural` now exports `minimum: 0`, and `Schema.Int.check(Schema.isGreaterThan(0))` exports `exclusiveMinimum: 0` without the safe-integer `minimum`.
