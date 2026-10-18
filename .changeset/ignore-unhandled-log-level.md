---
"effect": minor
---

Add `log: "Unhandled"` to `Effect.ignore`, `Effect.ignoreCause`, and their Stream and Channel variants. This resolves `References.UnhandledLogLevel` when a failure occurs and suppresses logging when that reference is `undefined`, while preserving each combinator's existing failure semantics.
