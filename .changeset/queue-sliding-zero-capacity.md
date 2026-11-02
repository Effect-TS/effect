---
"effect": patch
---

Fix sliding queues with zero capacity never waking a waiting taker, which left `Queue.take` and `Stream.callback({ bufferSize: 0, strategy: "sliding" })` hanging and made `Queue.offerAll` drop every message even when takers were waiting.
