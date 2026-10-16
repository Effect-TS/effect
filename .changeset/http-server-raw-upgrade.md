---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Support HTTP/1.1 upgrades to protocols other than WebSocket in the Node HTTP server. `HttpServerRequest.upgrade` answers `101 Switching Protocols` with the requested protocol and exposes the raw connection as a `Socket`. `Bun.serve` and `Deno.serve` only upgrade to WebSocket, so the Bun and Deno servers keep failing other upgrades and now say so in the error. On Bun 1.4+ and Deno, `NodeHttpServer` and the node:http client support them.
