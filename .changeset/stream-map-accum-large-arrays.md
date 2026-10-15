---
"effect": patch
---

Fix `Stream.mapAccum` throwing a `RangeError` when its callback returns a large array.
