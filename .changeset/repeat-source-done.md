---
"effect": patch
---

Fix `Effect.repeat`, `repeatOrElse`, `schedule` and `scheduleFrom` treating a `Cause.Done` failure from the repeated effect as schedule completion.
