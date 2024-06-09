---
"@effect/schema": patch
---

The `minItems` filter now checks for an invalid argument (`n < 1`) and, when valid, refines the type to `NonEmptyReadonlyArray<A>`.
