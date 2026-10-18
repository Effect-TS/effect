---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-deno": patch
"@effect/platform-bun": patch
---

Fix HTTP response framing: omit bodies for 204, 205 and 304, and remove `content-length` for 204 and 205. Node now aborts responses whose bodies do not match `content-length`. Deno and Bun preserve raw Web `Response` objects when merging headers, and Deno preserves their status and headers for HEAD requests.
