---
"effect": patch
---

Fix `Sink.collect` and `Sink.take` failing with a `RangeError` when collecting large input chunks.
