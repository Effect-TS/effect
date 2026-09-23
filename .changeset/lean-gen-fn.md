---
"effect": patch
---

Reduce allocations per `yield*` in `Effect.gen`, `Option.gen` and `Result.gen`, and per `Effect.fn` call.

`Utils.SingleShotGen` now serves as its own completion result and is no longer an `IterableIterator`: it only implements `next`, and its `self` field has been removed.
