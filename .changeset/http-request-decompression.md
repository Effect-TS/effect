---
"effect": patch
---

Add `HttpMiddleware.decompression`, which decompresses `gzip` and `deflate` request bodies, limits the decompressed size, and rejects other codings with `415`.
