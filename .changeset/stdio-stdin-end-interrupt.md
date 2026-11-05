---
"effect": minor
---

Add an `onStdinEnd: "interrupt"` option to `McpServer.layerStdio` and `RpcServer.layerProtocolStdio` so that stdio servers interrupt active requests and exit when stdin closes. `RpcServer` now waits for a disconnected client's requests to finish before calling `onDisconnect`.

### Breaking changes

- `RpcServer.layerProtocolStdio` and `RpcServer.makeProtocolStdio` are now functions: replace `RpcServer.layerProtocolStdio` with `RpcServer.layerProtocolStdio()` and `RpcServer.makeProtocolStdio` with `RpcServer.makeProtocolStdio()`.
