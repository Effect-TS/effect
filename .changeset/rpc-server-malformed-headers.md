---
"effect": patch
---

Fix `RpcServer` returning an empty HTTP 500 for requests with malformed headers; such requests now fail with a defect `Exit`, and malformed notifications are dropped.
