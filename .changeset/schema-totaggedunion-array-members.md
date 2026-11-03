---
"effect": patch
---

Fix `Schema.toTaggedUnion` dropping members from `discriminants`, `cases`, `guards` and `match` when the member list is typed as an array, such as `Object.values(members)` or a `NonEmptyReadonlyArray`.
