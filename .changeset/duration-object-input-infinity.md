---
"effect": patch
---

Fix `Duration.fromInputUnsafe` throwing on infinite nanosecond totals. It now returns an infinite duration, and `Duration.fromInput` returns `Some` instead of `None`.
