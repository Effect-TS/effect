---
"effect": patch
---

Fix `Cause.pretty`, `Cause.prettyErrors`, loggers and `runMain` overflowing the stack when an error's `cause` chain is cyclic.
