---
"effect": patch
---

Fix a stalled `RpcClient` stream consumer blocking other responses and keepalive pings on its socket or worker connection.
