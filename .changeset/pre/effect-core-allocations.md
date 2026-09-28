---
"effect": patch
---

Clean up rendered error stacks for common Effect callbacks and avoid per-step closure allocations in several combinators on V8.

`Effect.flatMap` callbacks now receive only the value, without internal fiber/exit arguments or an internal `this` receiver.
