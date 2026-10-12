---
"effect": patch
---

Fix `HttpServerResponse.toWeb` for a raw `Response` whose headers are immutable, such as `Response.redirect` or the WebSocket upgrade a Cloudflare Durable Object returns. The outer headers and cookies are now merged into a copy of the response instead of throwing, which left `toWebHandler` hanging.
