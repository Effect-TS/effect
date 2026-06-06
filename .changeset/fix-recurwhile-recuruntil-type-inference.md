---
"effect": patch
---

Fix `Schedule.recurWhile` and `Schedule.recurUntil` not inferring the predicate argument type when used with `Effect.repeat`.
