---
"@effect/platform-node-shared": patch
---

Wait for and escalate process-group cleanup on scope release after a referenced, detached POSIX command exits with a non-zero code. Honor `forceKillAfter` for descendants that ignore the configured kill signal, even after the group leader has exited.
