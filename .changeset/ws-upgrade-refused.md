---
"@effect/platform-node": patch
---

Fail a refused websocket upgrade instead of hanging the request fiber. When `ws` refuses the handshake it never calls the upgrade callback, so `request.upgrade` now fails on socket close and already-closed sockets skip the response write.
