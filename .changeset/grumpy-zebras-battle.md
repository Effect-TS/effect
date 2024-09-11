---
"@effect/schema": minor
---

Updates the constraints for members within a union from the more restrictive `Schema.Any` to the more inclusive `Schema.All`, closes #3587.

Involved APIs:

- `Schema.Union`
- `Schema.UndefinedOr`
- `Schema.NullOr`
- `Schema.NullishOr`
- `Schema.optional`
