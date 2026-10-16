---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-deno": patch
"@effect/platform-bun": patch
---

Fix bodyless and mismatched responses in the HTTP server adapters. 204, 205 and 304 responses never send a body, and 204 and 205 no longer send `content-length`, which made HTTP/2 clients reset the stream. `NodeHttpServer` aborts a response whose body doesn't match its `content-length` instead of corrupting the keep-alive connection or leaving the client waiting. Deno and Bun now copy a raw Web `Response` instead of modifying it, and on Deno a HEAD response for one keeps its status and headers, as on Bun.
