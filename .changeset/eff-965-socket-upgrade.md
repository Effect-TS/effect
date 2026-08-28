---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Add `socket.upgrade` for wrapping an acquired pull-based Node socket with TLS in place.

Node TCP server connections upgrade with the server TLS role, while `NodeSocket.makeNet` and raw duplex sockets use
the client role. Unsupported transports and failed TLS handshakes now fail with `SocketUpgradeError`.
