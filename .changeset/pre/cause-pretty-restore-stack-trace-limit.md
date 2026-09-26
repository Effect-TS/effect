---
"effect": patch
---

`Cause.pretty` and `Cause.prettyErrors` now restore `Error.stackTraceLimit` when formatting an error throws, instead of leaving it at `1` for the rest of the process.
