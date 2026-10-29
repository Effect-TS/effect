---
"effect": patch
---

Document that every request sent through an `RpcClient.Protocol` must end with an `Exit` or a `ClientProtocolError` for its id, and how a transport that only delivers requests acknowledges `discard` calls.
