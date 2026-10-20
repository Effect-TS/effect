---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-browser": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add raw HTTP/1.1 upgrades through `HttpClientRequest.upgrade`, `HttpClientResponse.upgrade`, the Node HTTP server, and `HttpApiSchema.Upgrade`. Node clients expose the upgraded connection as a `Socket`; HttpApi clients return `{ headers, socket }` and OpenAPI documents the 101 response.

Custom `HttpClientResponse` implementations must add `upgrade`. Fetch and XMLHttpRequest reject upgrade requests with a `TransportError` before anything is sent; Bun and Deno servers still support only WebSocket upgrades.
