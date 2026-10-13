---
"@effect/platform-node-shared": patch
---

Fail writes to a Node socket whose stream has already ended or been destroyed, instead of waiting forever for a `drain` event that never comes.
