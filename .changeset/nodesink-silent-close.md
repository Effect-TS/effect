---
"@effect/platform-node-shared": patch
---

Fix NodeSink hanging when a writable is destroyed without an error. Premature closure now fails through `onError`, while closure after completed writes settles successfully.
