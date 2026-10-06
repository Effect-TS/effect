---
"effect": patch
"@effect/opentelemetry": patch
---

Leave interrupt-only spans `Unset` with an `effect.fiber.interrupted: true` attribute instead of `Ok` with an "Interrupted" description and the `span.label` / `status.interrupted` attributes. Successful spans keep `Ok`; failures keep `Error` and their exception events.

`Cause.prettyErrors` no longer captures an internal stack frame for non-object failures such as `Effect.fail("boom")`; the stack is now the message plus the span frame, when available. This affects the `exception.stacktrace` exported by both tracers and the output of `Cause.pretty`.
