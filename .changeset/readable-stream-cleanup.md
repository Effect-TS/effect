---
"effect": patch
---

Fix `Channel.fromReadableStream`, `Channel.fromTransformStream` and `Stream.fromReadableStream` discarding rejected cancel hooks and leaving the reader locked after finalization. A rejected cancel hook is now a defect, and an already errored stream is not reported twice.
