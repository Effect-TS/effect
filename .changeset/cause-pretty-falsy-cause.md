---
"effect": patch
---

Fix `Cause.prettyErrors` and `Cause.pretty` dropping an error's `cause` when it is falsy, such as `0`, `false`, `""` or `null`. Loggers and tracers that render causes now include it too.
