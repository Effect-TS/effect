---
"effect": patch
---

Fix `Arbitrary.schema` to validate generated objects and automatic shrink candidates against matching index signatures, including fixed fields in `Schema.StructWithRest`.

Validation may discard candidates and exhaust the configured discard budget rather than emit invalid values. This corrects validity but does not make every inhabited intersection productive.
