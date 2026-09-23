---
"effect": patch
---

Bound retained storage in a `MutableList` that stays nonempty while values are appended and taken. Make `filter` pass each element's position in the list to its predicate, independent of bucket offsets.
