---
"effect": patch
---

Read the `ChildProcessSpawner` output that `exitCode`, `string`, `lines`, `streamString` and `streamLines` do not return, so a command that writes more than the pipe buffer to that output can exit instead of blocking.
