---
"effect": patch
---

Fix `Sink.takeUntil` and `Sink.takeUntilEffect` dropping the element after a match. They now stop at the match and return the remaining input as leftovers.
