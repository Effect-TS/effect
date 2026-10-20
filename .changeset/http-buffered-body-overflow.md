---
"effect": patch
"@effect/platform-node": minor
"@effect/platform-node-shared": minor
"@effect/platform-bun": minor
---

Return 413 instead of 400 when buffered or decompressed request bodies exceed their size limit, while preserving 400 for other parse failures. Node HTTP servers drain oversized bodies so the response can reach the client without destroying the socket. Node stream readers expose `MaxBytesError` and an optional `destroyOnOverflow` setting; their default destruction behavior is unchanged.
