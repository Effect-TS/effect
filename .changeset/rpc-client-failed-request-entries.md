---
"effect": patch
---

Fix `RpcClient` retaining requests that fail without a reply, after a connection error, a defect, or a failed send.
