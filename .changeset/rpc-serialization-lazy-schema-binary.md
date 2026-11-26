---
"effect": patch
---

Load `SchemaBinary` dynamically when `RpcSerialization.layerSchemaBinary` is built instead of when `effect/rpc/RpcSerialization` is imported, so JSON-only `RpcServer`, `RpcClient`, and `McpServer` entry points do not statically load `SchemaBinary` on cold start. Building `layerSchemaBinary` is now asynchronous.
