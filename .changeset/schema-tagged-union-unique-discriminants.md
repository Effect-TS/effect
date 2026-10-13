---
"effect": patch
---

Reject duplicate discriminants at compile time in `Schema.toTaggedUnion`, including duplicates in nested unions and numeric/string property-key collisions such as `1` and `"1"`.
