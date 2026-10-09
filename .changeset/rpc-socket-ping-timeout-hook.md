---
"effect": patch
---

Add `onPingTimeout` to `RpcClient.makeProtocolSocket` and `RpcClient.layerProtocolSocket` to distinguish ping timeouts from other socket failures. It runs only when a ping timeout drops an open connection, before `onDisconnect` and in-flight call failures; defects are logged and ignored.
