---
"@effect/platform-node-shared": patch
---

Honor `forceKillAfter` during scope release after a command leader exits with a non-zero code, so surviving descendants that ignore the termination signal are forcefully killed.
