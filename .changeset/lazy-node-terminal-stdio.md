---
"@effect/platform-node-shared": patch
---

Fix unused `NodeTerminal` layers changing piped stdio flags and causing truncated output in programs started with `process.execve`.
