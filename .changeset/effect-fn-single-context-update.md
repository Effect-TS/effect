---
"effect": patch
---

`Effect.fn` with a span name and `Effect.withSpan` now provide the span and its stack frame in one context update with one exit handler, instead of three nested updates, which removes about a third of the allocation per traced call.
