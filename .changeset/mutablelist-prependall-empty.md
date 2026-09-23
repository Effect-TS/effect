---
"effect": patch
---

`MutableList.prependAll` and `prependAllUnsafe` with no values now leave the list unchanged. Before, on a non-empty list every later `take` returned `undefined`, `length` went negative and the existing elements could never be taken; on an empty list the next `appendAll` threw.
