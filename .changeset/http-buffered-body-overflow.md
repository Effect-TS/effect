---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
"@effect/platform-bun": patch
---

Return 413 instead of 400 when buffered or decompressed request bodies exceed their size limit, while preserving 400 for other parse failures. Node HTTP servers drain oversized bodies so the response can reach the client without destroying the socket. Node stream readers expose `MaxBytesError` and an optional `destroyOnOverflow` setting; their default destruction behavior is unchanged.
