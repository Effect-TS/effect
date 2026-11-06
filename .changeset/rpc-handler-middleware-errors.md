---
"effect": patch
---

Allow RPC handlers to fail with their server middleware's errors without repeating them in the RPC's `error` schema; handlers returned by `RpcGroup.accessHandler` can now fail with those errors too.
