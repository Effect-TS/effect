---
"effect": patch
---

Fix a stalled `RpcClient` stream consumer blocking other responses on its socket or worker connection, which could drop a healthy socket with a ping timeout.
