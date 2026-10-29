---
"effect": patch
---

Fix `RpcClient` acknowledging stream chunks dropped by an interrupted consumer, which could drain the entire server stream before the interrupt was sent.
