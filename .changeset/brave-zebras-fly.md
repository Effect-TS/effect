---
"@effect/schema": minor
---

Make json schema output more compatible with Open AI structured output, closes #3432.

JSONSchema

- remove `oneOf` in favour of `anyOf` (e.g. in `JsonSchema7object`, `JsonSchema7empty`, `JsonSchema7Enums`)
- remove `const` in favour of `enum` (e.g. in `JsonSchema7Enums`)
- remove `JsonSchema7Const` type
- remove `JsonSchema7OneOf` type

AST

- remove `identifier` annotation from `Schema.Null`
- remove `identifier` annotation from `Schema.Object`
