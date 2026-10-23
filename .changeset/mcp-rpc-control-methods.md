---
"effect": patch
---

Add a `controlMessages` option to the JSON-RPC serializations in `RpcSerialization`. MCP servers disable it, so `@effect/rpc/*` notifications from MCP clients no longer stop stdio servers or write `@effect/rpc/Pong` to stdout.
