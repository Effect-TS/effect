---
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Add `NodeSocketServer.makeTls` and `NodeSocketServer.layerTls` for TLS socket servers.

These mirror `make` / `layer` but build the server with `tls.createServer`, so they take the full `tls.TlsOptions` set
alongside the usual listen options: certificates (`cert` / `key`), trust anchors for client certificates (`ca`), ALPN
protocols, and SNI callbacks. Handlers run once the handshake completes and receive the `tls.TLSSocket` as
`NodeSocket.NetSocket`. Connections that fail the handshake are destroyed; the server keeps listening.
