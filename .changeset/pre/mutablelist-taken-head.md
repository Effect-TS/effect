---
"effect": patch
---

Fix `MutableList.takeN` leaving a drained bucket at the head when it stops at a bucket boundary. This also prevents `Queue.takeN` from making subsequent messages inaccessible after an `offerAll` boundary.
