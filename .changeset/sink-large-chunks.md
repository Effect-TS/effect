---
"effect": patch
---

Fix `Sink.collect` and `Sink.take` throwing a `RangeError` on large input chunks.
