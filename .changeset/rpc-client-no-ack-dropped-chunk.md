---
"effect": patch
---

Fix an interrupted `RpcClient` stream letting the server keep producing chunks until the stream ends on transports that acknowledge chunks.
