---
"effect": patch
---

Fix `Duration.fromInputUnsafe` throwing a `RangeError` when the input adds up to an infinite number of nanoseconds, such as `{ seconds: Infinity, nanoseconds: 1 }` or `[1e300, 1]`. It now returns an infinite duration, and `Duration.fromInput` returns `Some` instead of `None`.
