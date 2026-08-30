---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add reader-scoped TLS upgrades for wrapping an acquired pull-based socket in place.

Node TCP server connections upgrade with the server TLS role, while client-side Node and Deno TCP sockets upgrade
with the client role. Unsupported transports and failed TLS handshakes now fail with `SocketUpgradeError`.
Client upgrades no longer require `key` and `cert`; server upgrades require both and reject missing or incomplete
credentials with `SocketUpgradeError`. Client upgrades that need no other settings can be called as `upgrade()`.
