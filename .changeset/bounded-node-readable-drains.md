---
"@effect/platform-node-shared": minor
---

Bound Node stream and socket pulls to at most `chunkSize` chunks (default 4096), preventing synchronously refilling sources from draining indefinitely in one pull. Add a `chunkSize` option to Node socket constructors and a separate `readSize` option for Node stream `read(size)` calls; callers previously using `chunkSize` for byte read sizes should use `readSize` instead. Set `chunkSize: Infinity` to opt into unbounded batching.
