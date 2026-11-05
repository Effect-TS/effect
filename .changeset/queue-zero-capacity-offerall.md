---
"effect": patch
---

Fix zero-capacity bounded and dropping queues accepting offers without a new taker after `Queue.offerAll`, which also affected `Stream.buffer({ capacity: 0 })`.
