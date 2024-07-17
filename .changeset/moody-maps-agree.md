---
"@effect/schema": patch
---

remove type-level error message from `optional` signature, closes #3290

This fix eliminates the type-level error message from the `optional` function signature, which was causing issues in generic contexts.
