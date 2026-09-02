---
"@effect/platform-node-shared": patch
---

Fix NodeSink writable adapters hanging when a writable reports an error during finalization. These errors now fail the sink through the supplied `onError` mapper.
