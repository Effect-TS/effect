---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-deno": patch
---

Fix response framing in the HTTP server adapters. 204, 205 and 304 responses are sent without a body on every adapter, and 204 and 205 also drop `content-length`, which HTTP/2 clients reject. `NodeHttpServer` aborts a response whose body doesn't match its `content-length`. Before, a longer body corrupted the keep-alive connection and a shorter one left the client waiting. Adds `HttpServerResponse.withoutBody`, the response as sent when its body is omitted.
