---
"@effect/cluster": patch
---

Interrupt non-persisted streaming RPCs when an entity restarts after a defect instead of replaying them. A finite non-persisted stream cut off by a restart now ends with an interruption, and its handler is no longer replayed with `lastSentChunk`. Persisted requests and streams still replay, and graceful teardown is unchanged.
