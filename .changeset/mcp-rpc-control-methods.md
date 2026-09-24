---
"effect": patch
---

Add a `controlMessages` option to the JSON-RPC serializations in `RpcSerialization`. MCP servers now set it to `false`, so `@effect/rpc/*` notifications from MCP clients are treated as unknown notifications. An `@effect/rpc/Eof` notification no longer stops a stdio server, and `@effect/rpc/Ping` no longer writes a non-MCP `@effect/rpc/Pong` message.
