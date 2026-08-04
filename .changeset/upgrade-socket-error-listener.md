---
"@effect/platform-node": patch
---

Stop a reset upgrade connection from crashing the process in `NodeHttpServer`

Node removes its own socket listeners when it emits `upgrade`, and `ws` only attaches its own once `handleUpgrade` runs. In between - and for any upgrade that never completes the handshake - the socket had no `error` listener, so a peer resetting the connection raised an unhandled `'error'` event and took the process down.
