---
"effect": patch
---

Reject an append assignment such as `FOO+=bar cmd` in `CommandLine.template` and `ChildProcess.make` with `UnsupportedSyntax`, as `FOO=bar cmd` already is, instead of running `FOO+=bar` as the program.
