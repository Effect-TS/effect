---
"effect": patch
---

Fix `ChildProcessSpawner` helpers hanging when a command fills a pipe the helper never reads. `exitCode` now reads and discards `stdout` and `stderr` until the process exits, and `string`, `lines`, `streamString` and `streamLines` read and discard `stderr` unless `includeStderr` is set. A failure reading that output while the helper runs, such as from an output `Sink`, now fails the helper.
