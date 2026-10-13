---
"@effect/platform-node-shared": patch
---

Fail writes to ended or destroyed Node socket streams instead of waiting indefinitely for `drain`.
