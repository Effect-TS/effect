---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add HTTP response compression support.

`HttpMiddleware.compression` negotiates `Accept-Encoding` per RFC 9110, applies
skip logic (status, existing `Content-Encoding`, `Cache-Control: no-transform`,
content type, `minSize`), and manages the `Vary` header. The `HttpPlatform`
service gains a `compression` primitive that advertises supported algorithms
(gzip, deflate, br, zstd) and transforms response bodies using the fastest
native API on each platform: `node:zlib` on Node.js, `Bun.gzipSync` and Bun's
extended `CompressionStream` on Bun, `CompressionStream` plus `node:zlib`
compatibility streams on Deno, and `CompressionStream` (gzip/deflate only) for
web handlers. One-shot bodies keep an exact `Content-Length`, streaming bodies
compress incrementally, and strong ETags are weakened on transformed
responses.
