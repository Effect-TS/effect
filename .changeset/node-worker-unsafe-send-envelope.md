---
"@effect/platform-node": patch
---

Fix `NodeWorkerRunner`'s `sendUnsafe` dropping reply payloads in worker threads and child processes. Unsafe replies now preserve the same application messages as `send`.
