---
"@effect/schema": minor
---

Change the `MessageAnnotation` type to be non-parametric; now it's simply `(u: unknown) => string` to accommodate custom error messages, which can be triggered by any circumstances
