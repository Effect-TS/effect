---
"@effect/schema": minor
---

Updates the constraints for members within a union from the more restrictive `Schema.Any` to the more inclusive `Schema.All`, closes #3587.

Affected APIs include:

- `Schema.Union`
- `Schema.UndefinedOr`
- `Schema.NullOr`
- `Schema.NullishOr`
- `Schema.optional`
- `AST.Union.make` now retains duplicate members and no longer eliminates the `neverKeyword`.
