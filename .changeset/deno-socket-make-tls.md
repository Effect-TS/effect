---
"@effect/platform-deno": patch
---

Add `DenoSocket.makeTls`, `makeTlsChannel`, and `layerTls` for native TLS connections, including client certificates for mutual TLS.

Releasing a socket writer after the peer has already closed the connection no longer dies with an `UnknownError`.
