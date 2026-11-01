---
"effect": patch
---

Fix `Stream.groupAdjacentBy` dropping its last group when the stream fails. The group is now emitted before the error.
