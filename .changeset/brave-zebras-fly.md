---
"@effect/schema": minor
---

Make json schema output more compatible with Open AI structured output, closes #3432.

- remove `oneOf` in favour of `anyOf`
- remove `const` in favour of `enum`
- remove `identifier` annotation from `Schema.Null`
- remove `identifier` annotation from `Schema.Object`
