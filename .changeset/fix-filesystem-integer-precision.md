---
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"effect": patch
---

Prevent precision loss in Node/Bun filesystem operations and `HttpPlatform` file responses.

Writes reject unsafe positions with `BadArgument`. Stats preserve `size` and
`blksize` exactly and reject unsafe numeric metadata, including optional fields.
Large inode values can therefore prevent stat and file serving even for small files.

`HttpPlatform.make` now passes bigint `contentLength` to its callback, preserving
exact headers for whole files above `Number.MAX_SAFE_INTEGER`. Invalid range
inputs and unsafe runtime range bounds fail with `BadArgument`.
`HttpStaticServer` also preserves exact range calculations and `Content-Range` totals.
