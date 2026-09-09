---
"@effect/opentelemetry": patch
---

Preserve OpenTelemetry trace propagation through unnamed `Effect.fn` and disabled spans by using the nearest propagated parent. Make `Tracer.currentOtelSpan` skip these spans as well.
