---
"effect": patch
---

Keep `Queue.takeN` suspended when only part of its requested batch is available. Previously a single offer woke the batch taker in a synchronous retry loop that starved the host. `Queue.State.takers` now holds `Queue.Taker` entries: call `entry.resume(...)` instead of calling the entry as a function.
