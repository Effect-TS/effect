---
"@effect/experimental": minor
"effect": minor
---

Add `Schema.requiredToOptionalOrFail`, an effectful version of `requiredToOptional` that allows decode/encode transformations to fail with `ParseIssue`.

Refactor `VariantSchema.Overrideable` to use `requiredToOptionalOrFail`, making the property truly optional on the type side.
