---
"@effect/graphql-generator": patch
---

Emit Struct schemas with same-named interfaces for object selections, object fragments and ordinary input objects instead of Opaque classes, reducing TypeScript type-checking overhead while preserving runtime codecs. Nested inferred types and editor hovers may now expand structurally rather than displaying selection names.
