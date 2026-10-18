---
"@effect/platform-node-shared": patch
---

Fix `NodeSink.fromWritable` hanging when a writable finishes normally before all upstream chunks are written. Write callback errors are mapped through `onError`, and normal finish releases backpressure waits while empty upstreams still succeed. Keep handling delayed error events during asynchronous destruction to prevent unhandled stream errors.
