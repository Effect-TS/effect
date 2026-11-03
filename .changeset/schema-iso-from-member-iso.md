---
"effect": patch
---

Fix the `Iso` type of `Schema.TaggedUnion` and `Schema.brand`: both took it from the member's `Type` instead of its `Iso`, so `Schema.toIso` typed a nested class as its instance while it returns the class's fields.
