---
"effect": minor
---

Encode integral `SchemaBinary` numbers as sign-magnitude varints. Non-integral values remain IEEE 754 binary64, while integer-constrained schemas always use varints.
