---
"effect": patch
---

Load `SchemaBinary` lazily when `RpcSerialization.layerSchemaBinary` is built instead of when `effect/rpc/RpcSerialization` is imported, so JSON-only RPC and MCP consumers do not load it eagerly. Building `layerSchemaBinary` is now asynchronous.
