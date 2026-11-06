---
"effect": patch
---

Drain framed HTTP RPC responses while a request batch is dispatched, so batches producing more responses than `streamBufferSize` no longer deadlock.
