---
"@effect/platform-node-shared": patch
---

Fix Node processes using `NodeStdio.layer` staying alive after their `Stdio.stdin` consumers finish or are interrupted while stdin is still open.
