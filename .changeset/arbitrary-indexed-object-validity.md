---
"effect": patch
---

Fix `Arbitrary.schema` to validate generated objects and automatic shrink candidates against all matching index signatures, including fixed fields in `Schema.StructWithRest`. Valid generated objects retain their original identities and prototypes.

Validation may now discard candidates and exhaust the configured discard budget rather than emit invalid values. This is a validity correction, not constructive intersection generation: an unconstrained `Schema.String` fixed field combined with a `Schema.NonEmptyString` index value can still exhaust at size zero, including progressive checks that cannot advance past discarded attempts. Matching fixed-field constraints can avoid this case. Nested validation callbacks may run more often.
