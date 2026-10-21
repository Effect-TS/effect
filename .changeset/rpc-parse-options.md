---
"effect": patch
---

Add a `parseOptions` option to `RpcClient.make` and the `RpcServer` constructors, so RPC payloads and responses can be decoded and encoded with options such as `concurrency`.
