---
"effect": patch
---

Correct `Effect.repeatOrElse` fallback types to expose the previous step's `Schedule.Metadata`, matching the value already passed at runtime. Explicit fallback annotations using `Option.Option<Output>` must change to `Option.Option<Schedule.Metadata<Output, Input>>`; when the option is `Some`, read `previous.value.output` for the schedule output rather than treating `previous.value` as the output itself. Runtime behavior is unchanged.
