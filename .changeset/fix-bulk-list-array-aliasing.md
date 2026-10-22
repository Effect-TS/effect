---
"effect": patch
---

Fix `Queue.offerAll`, `MutableList.appendAll`, and `MutableList.prependAll` storing the caller's array by reference, so later changes to that array no longer alter queued values.
