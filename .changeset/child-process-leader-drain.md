---
"@effect/platform-node-shared": patch
"effect": patch
---

Fix child-process cleanup without `forceKillAfter` to give remaining process-group members up to one second to exit after the leader exits. Clarify that waiting for the leader has no time limit and never escalates to `SIGKILL` when `forceKillAfter` is omitted.
