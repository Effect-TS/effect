---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-deno": patch
---

Fix response framing in the HTTP server adapters. 204, 205 and 304 responses are sent without a body on every adapter, and 204 and 205 also drop `content-length`, which HTTP/2 clients reject. `NodeHttpServer` aborts a response whose body doesn't match its `content-length` instead of corrupting the keep-alive connection or leaving the client waiting. On Deno, a HEAD response for a raw Web `Response` now keeps that `Response`'s status and headers, as on Bun.
