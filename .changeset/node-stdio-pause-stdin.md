---
"@effect/platform-node-shared": patch
---

Pause `process.stdin` when the last `NodeStdio` `Stdio.stdin` consumer stops so the Node process can exit while stdin remains open.
