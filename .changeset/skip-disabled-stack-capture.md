---
"effect": patch
---

Skip optional stack capture when `Error.stackTraceLimit` is zero in `Effect.fn`, spans, layer and middleware service definitions, and atom labels. Preserve named spans and explicit stack callbacks, and avoid raising a zero limit when formatting causes.
