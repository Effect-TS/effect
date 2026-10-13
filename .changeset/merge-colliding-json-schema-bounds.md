---
"effect": patch
---

Tighten a colliding inclusive `minimum` or `maximum` in place when exporting JSON Schema, instead of moving it into `allOf`. Declared bounds on `Schema.Int`, such as the `minimum: 0` of `Schema.Natural`, now appear at the top level along with the check's annotations.
