---
"@effect/opentelemetry": patch
---

Preserve OpenTelemetry trace propagation through unnamed `Effect.fn` and disabled spans by using the nearest propagated parent. Make `Tracer.currentOtelSpan` skip these spans as well.

When no propagated ancestor exists, the bridge preserves the ambient OpenTelemetry context, allowing child spans to inherit an active OpenTelemetry parent. `Tracer.currentOtelSpan` now fails with `NoSuchElementException` in this case instead of returning a span backed by the fake `noop` context.
