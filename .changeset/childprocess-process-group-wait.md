---
"@effect/platform-node-shared": patch
"effect": patch
---

Wait for the whole process group when releasing or killing a Node child process.

Scoped release and `kill` already signalled the process group but only waited for the leader's `exit`. A leader that dies before its descendants (for example a `sh -c` wrapper that does not `exec`) returned early, so descendants kept running and `forceKillAfter` never escalated.

Both paths now wait for the leader's `exit` and then for the rest of the process group to terminate. Without `forceKillAfter` the group wait is bounded to one second and never escalates to `SIGKILL`. With `forceKillAfter` the group receives `SIGKILL` once the timeout elapses, followed by a final bounded wait. The wait is based on process existence, not on stdio, so a pipe held by a descendant or left unread cannot hang release. `exitCode` and `isRunning` remain tied to the leader's `exit`, and a leader that already exited successfully still leaves its process group untouched.
