---
"effect": patch
---

Fix duplicate Queue messages when a resumed producer synchronously takes from the same queue. `releaseCapacity` now removes a pending offer before resuming its producer and recomputes available capacity on every iteration, so reentrant calls can no longer admit the same offer twice or exceed the queue's capacity.
