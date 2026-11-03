---
"effect": patch
---

Restore backpressure for zero-capacity queues after `Queue.offerAll`, including `Stream.buffer({ capacity: 0 })`.
