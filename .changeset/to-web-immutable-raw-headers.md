---
"effect": patch
---

Fix `HttpServerResponse.toWeb` for a raw `Response` with immutable headers, such as `Response.redirect` or a WebSocket upgrade from a Cloudflare Durable Object. Outer headers and cookies are now merged into a copy of the response. Previously the merge threw and `toWebHandler` never responded.
