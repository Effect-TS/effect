---
"@effect/platform-node-shared": minor
---

Bound Node stream and socket pulls to at most `chunkSize` chunks (default 4096), preventing synchronously refilling sources from draining indefinitely in one pull. Add a `chunkSize` option to Node socket constructors, while preserving explicit Node stream `read(size)` behavior.
