---
"@effect/schema": patch
---

Refactor the `declare` signature to ensure that the decoding and encoding functions do not utilize context.

As a result, we can relax the signature of the following functions to accept `R !== never`:

- `Parser.validateSync`
- `Parser.validateOption`
- `Parser.validateEither`
- `Parser.is`
- `Parser.asserts`
- `Schema.validateSync`
- `Schema.validateOption`
- `Schema.validateEither`
- `Schema.is`
- `Schema.asserts`

Additionally, the `Class` API no longer requires the optional argument `disableValidation` to be `true` when `R !== never`.
