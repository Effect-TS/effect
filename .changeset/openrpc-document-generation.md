---
"effect": patch
---

Add `OpenRpc.fromRpcGroup` to `effect/rpc`. It builds an OpenRPC 1.3.2 document from an `RpcGroup` without handlers or a running server, describing each method's encoded parameters, result and errors with shared Draft 7 schemas. Annotate a group or a single method with `OpenRpc.Summary`, `OpenRpc.Description`, `OpenRpc.Tags`, `OpenRpc.Examples`, `OpenRpc.Deprecated`, `OpenRpc.ExternalDocs` or `OpenRpc.Errors`, or with `OpenRpc.annotations`, to add documentation. Streaming methods carry an `x-effect-stream` extension and structured payloads an `x-effect-params-schema` extension for Effect-aware tooling.
