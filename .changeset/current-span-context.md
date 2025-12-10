---
"@effect/opentelemetry": patch
---

Fix `Tracer.currentOtelSpan` to work with OTLP module

`currentOtelSpan` now works with both the official OpenTelemetry SDK and the lightweight OTLP module. When using OTLP, it returns a read-only wrapper that provides `spanContext()` with the correct traceId, spanId, and traceFlags. The wrapper has no-op implementations for mutating methods since OTLP spans are managed differently.

Closes #5889
