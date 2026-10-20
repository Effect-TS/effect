---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-browser": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add raw HTTP/1.1 upgrades through `HttpClientRequest.upgrade`, `HttpClientResponse.upgrade`, the Node HTTP server, and `HttpApiSchema.Upgrade`. Node clients expose the upgraded connection as a `Socket`; HttpApi clients return `{ headers, socket }` and OpenAPI documents the 101 response.

Custom `HttpClientResponse` implementations must add `upgrade`. Fetch and XMLHttpRequest cannot hand over a connection, so their `upgrade` fails with a `StatusCodeError`; Bun and Deno servers still support only WebSocket upgrades.
