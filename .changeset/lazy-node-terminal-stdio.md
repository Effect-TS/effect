---
"@effect/platform-node-shared": patch
---

Fix `NodeTerminal` accessing stdio streams it does not use, which could make inherited pipes non-blocking and truncate output after `process.execve`.
