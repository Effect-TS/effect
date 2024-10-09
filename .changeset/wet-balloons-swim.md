---
"@effect/schema": patch
---

Allow Schema.Either to support Schema.Never without type errors, closes #3755.

- Updated the type parameters of `format` to extend `Schema.All` instead of `Schema<A, I, R>`.
- Updated the type parameters of `Schema.EitherFromSelf` to extend `Schema.All` instead of `Schema.Any`.
- Updated the type parameters of `Schema.Either` to extend `Schema.All` instead of `Schema.Any`.
- Updated the type parameters of `Schema.EitherFromUnion` to extend `Schema.All` instead of `Schema.Any`.
