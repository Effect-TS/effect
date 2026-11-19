---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-deno": patch
---

Fail writes with a SocketError after an accepted socket's reader is released instead of waiting for a connection that cannot reopen.
