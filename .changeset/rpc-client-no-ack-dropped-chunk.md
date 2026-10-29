---
"effect": patch
---

Fix an interrupted `RpcClient` stream letting the server keep producing chunks on transports that acknowledge them.
