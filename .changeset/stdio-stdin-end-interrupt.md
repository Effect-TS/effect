---
"effect": minor
---

Add `onStdinEnd: "interrupt"` to `McpServer.layerStdio` and `RpcServer.layerProtocolStdio` to stop the server when stdin closes, interrupting active requests without remote cancellation.

### Breaking changes

- `RpcServer.layerProtocolStdio` and `RpcServer.makeProtocolStdio` are now functions: replace `RpcServer.layerProtocolStdio` with `RpcServer.layerProtocolStdio()` and `RpcServer.makeProtocolStdio` with `RpcServer.makeProtocolStdio()`.
