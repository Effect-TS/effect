---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-deno": minor
---

Support passing existing numeric file descriptors to `ChildProcess` (`stdin`, `stdout`, `stderr`, and `additionalFds`) and add `ChildProcessHandle.exitStatus` (`ExitStatus`) to report normal exit codes and terminating signals as structured values.

Custom `ChildProcessSpawner.makeHandle` implementations now need to provide `exitStatus`.
