---
"effect": patch
---

Treat an `Infinity` capacity passed to `PubSub.bounded`, `PubSub.dropping`, `PubSub.sliding`, and `PubSub.makeAtomicBounded` as unbounded instead of throwing `RangeError: Invalid array length`. This also fixes `Stream.broadcast` and `Stream.share` with `capacity: Infinity`.
