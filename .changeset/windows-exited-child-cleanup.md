---
"@effect/platform-node-shared": patch
---

Skip Windows `taskkill` cleanup for children that have already exited, since their PID may have been reused.
