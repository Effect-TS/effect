---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Add `Stdio.stderrIsTerminal`, alongside `stdinIsTerminal` and `stdoutIsTerminal`, so programs can tell whether standard error is attached to a terminal.
