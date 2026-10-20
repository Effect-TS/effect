---
"effect": patch
---

Fix `Effect.repeat`, `Effect.repeatOrElse`, `Effect.schedule`, and `Effect.scheduleFrom` so a `Cause.Done` failure from the repeated effect fails the result (or reaches `orElse`) instead of becoming a success.
