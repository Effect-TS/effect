---
"effect": patch
---

Remove the type-level uniqueness check from `Schema.toTaggedUnion` so generic member lists compile again. Duplicate discriminants still throw at runtime.
