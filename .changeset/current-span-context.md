---
"@effect/opentelemetry": patch
---

Fix `Tracer.currentOtelSpan` to work with OTLP module

`currentOtelSpan` now works with both the official OpenTelemetry SDK and the lightweight OTLP module. When using OTLP, it returns a wrapper that conforms to the OpenTelemetry Span interface.

Closes #5889
