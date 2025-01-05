---
"effect": patch
---

Refine `Effect.validateAll` return type to use `NonEmptyArray` for errors.

This refinement is possible because `Effect.validateAll` guarantees that when the input iterable is non-empty, any validation failure will produce at least one error. In such cases, the errors are inherently non-empty, making it safe and accurate to represent them using a `NonEmptyArray` type. This change aligns the return type with the function's actual behavior, improving type safety and making the API more predictable for developers.
