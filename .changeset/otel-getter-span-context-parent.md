---
"@effect/opentelemetry": patch
---

Preserve parent trace and span IDs when an active OpenTelemetry span context exposes them through getters, such as dd-trace.
