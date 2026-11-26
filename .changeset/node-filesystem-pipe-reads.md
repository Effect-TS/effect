---
"@effect/platform-node-shared": patch
---

Fix `FileSystem.File` reads and writes, and `FileSystem.stream`, failing with `ESPIPE` on pipes, FIFOs, sockets and terminals.
