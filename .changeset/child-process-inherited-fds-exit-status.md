---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-deno": minor
---

Support passing numeric file descriptors in `ChildProcess` (`stdin`, `stdout`, `stderr`, and `additionalFds`) and add `ChildProcessHandle.exitStatus` (`ExitStatus`) for structured exit codes and terminating signals.

Custom `ChildProcessSpawner.makeHandle` implementations must now provide `exitStatus`.
