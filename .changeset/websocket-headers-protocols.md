---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Allow WebSocket clients on Node and Bun to send handshake headers alongside subprotocols through socket constructors, channels, and layers. Preserve browser-compatible constructor calls when headers are not supplied.
