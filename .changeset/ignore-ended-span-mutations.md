---
"effect": patch
"@effect/opentelemetry": patch
---

Ignore `end`, `attribute`, `event`, and `addLinks` calls on spans that have already ended. Logs and `Effect.annotateCurrentSpan` from fibers that outlive their span no longer modify the ended span, `OtlpTracer` no longer exports a span twice when `end` is called again, `OtelSpan` no longer triggers OpenTelemetry SDK warnings for late calls, and the DevTools tracer no longer sends events for ended spans.
