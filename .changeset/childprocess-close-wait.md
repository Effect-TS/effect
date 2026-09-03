---
"@effect/platform-node-shared": patch
---

Wait for the spawned process `close` event (inherited stdio released) in scoped release and `kill`, so a non-exec'ing shell leader cannot abandon descendants.
