---
"effect": patch
---

Fix `Queue.offerAll`, `MutableList.appendAll` and `MutableList.prependAll` keeping a reference to the caller's array. Changing that array afterward no longer changes the queued values.
