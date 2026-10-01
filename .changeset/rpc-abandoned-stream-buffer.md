---
"effect": patch
---

Fix `RpcClient` stream interruption leaving chunk delivery blocked on a full buffer and stalling the shared protocol receive loop.
