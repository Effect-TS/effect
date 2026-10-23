---
"effect": patch
---

Fix `CommandLine.template` accepting an append assignment such as `FOO+=bar cmd`, which bash and zsh read as a variable assignment.
