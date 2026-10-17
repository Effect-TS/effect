---
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
---

Release writables created by `NodeSink.fromWritable` and `fromWritableChannel` when upstream fails or the sink is interrupted, preserving the original exit cause. Writables using `endOnDone: false` remain open. Preserve stream body encoding errors in the Node HTTP client instead of reporting transport errors caused by request cleanup.
