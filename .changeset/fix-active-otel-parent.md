---
"effect": patch
"@effect/opentelemetry": patch
---

Allow spans without an Effect parent to inherit an active OpenTelemetry span created outside Effect, such as one started by plain JavaScript or `startActiveSpan`. Explicit `root: true` continues to start a new trace.

The OpenTelemetry context that Effect installs for its own spans is not inherited this way. An Effect run started from inside a traced effect (for example with `Effect.runPromise` or from a `setTimeout` callback), or a span-less fiber resumed by one, still starts a new trace; use `Effect.withParentSpan` to continue it. Spans below a `DisablePropagation` span or a tracer-disabled region no longer receive an invalid `noop` OpenTelemetry parent, and raw OpenTelemetry spans created there attach to the nearest propagated Effect span.
