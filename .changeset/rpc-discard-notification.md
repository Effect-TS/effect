---
"effect": minor
---

Calls made with `discard: true` through `RpcClient.make` no longer get a reply, except over the worker protocol, which still waits for the `Exit`. They are sent as notifications, and `RpcServer` runs them without sending an `Exit` or a `Defect`. `RpcServer` also stops replying to JSON-RPC notifications, and overlapping JSON-RPC notifications no longer collide on their shared empty id. Over `jsonRpc` and `ndJsonRpc` a discarded call is now sent without an id, so if you use `discard` with JSON-RPC, upgrade servers before clients.
