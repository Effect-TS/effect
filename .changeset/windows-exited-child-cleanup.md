---
"@effect/platform-node-shared": patch
---

Skip Windows taskkill cleanup once a child has exited, avoiding redundant process launches and cleanup against a potentially reused PID.
