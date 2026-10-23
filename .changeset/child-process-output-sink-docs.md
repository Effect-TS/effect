---
"effect": patch
---

Clarify that `ChildProcess` output sinks for `stdout`, `stderr` and output `additionalFds` only receive data while the corresponding handle stream is consumed, and that the handle stream emits the sink's results.
