---
"effect": patch
---

Make `isAnyOf` on `Schema.TaggedUnion` and `Schema.toTaggedUnion` reject literal tags that are not in the union, while still accepting wide arrays such as `ReadonlyArray<string>`.
