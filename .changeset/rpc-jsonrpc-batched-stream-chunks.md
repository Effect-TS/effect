---
"effect": patch
---

Fix `RpcSerialization.jsonRpc` and `ndJsonRpc` dropping or reordering stream chunks when a stream request is sent in a JSON-RPC batch.
