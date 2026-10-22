---
"effect": minor
---

Add an `onDisconnect` option to `RpcServer.make` and its layer and HTTP wrappers, so applications can observe client disconnects without taking from `Protocol.disconnects` and preventing the server from interrupting the disconnected client's requests.
