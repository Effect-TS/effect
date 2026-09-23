---
"effect": patch
---

Add an `onDisconnect` callback to `RpcServer.make` for observing passive client disconnects without consuming the protocol disconnect queue.
