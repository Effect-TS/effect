---
"effect": patch
---

Add an `onPingTimeout` option to `RpcClient.makeProtocolSocket` and `RpcClient.layerProtocolSocket`. It runs when a ping timeout drops the connection, before `ConnectionHooks.onDisconnect`, so clients can tell a server that stopped responding from one that closed the connection.
