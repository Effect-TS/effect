---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Support HTTP/1.1 upgrades to protocols other than WebSocket in the Node HTTP server. `HttpServerRequest.upgrade` answers `101 Switching Protocols` with the requested protocol and exposes the raw connection as a `Socket`. The Bun server still only upgrades to WebSocket and now says so in the error.
