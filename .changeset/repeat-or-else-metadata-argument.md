---
"effect": patch
---

Correct the `Effect.repeatOrElse` fallback type to expose the previous step's `Schedule.Metadata`, matching the existing runtime value. Callers with an explicit `Option.Option<Output>` annotation must use `Option.Option<Schedule.Metadata<Output, Input>>` and read fields such as `previous.value.output` after narrowing to `Some`. Runtime behavior is unchanged.
