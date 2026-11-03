---
"effect": patch
---

Fix `Schema.toTaggedUnion` types for member lists typed as arrays, such as `Object.values(cases)` or a `NonEmptyReadonlyArray`: `discriminants`, `cases`, `guards`, `match` and `matchOrElse` no longer drop the array's members.
