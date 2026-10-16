---
"@effect/platform-node-shared": patch
---

Release writables created by `NodeSink.fromWritable` and `fromWritableChannel` when upstream fails or the sink is interrupted, preserving the original exit cause. Writables using `endOnDone: false` remain open.
