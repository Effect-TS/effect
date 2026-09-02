---
"effect": patch
"@effect/opentelemetry": patch
---

Preserve negative deltas for non-incremental counters in OTLP and OpenTelemetry metric exports instead of treating decreases as counter resets. Incremental counter reset handling and cumulative exports are unchanged.
