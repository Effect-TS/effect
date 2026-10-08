---
"@effect/opentelemetry": patch
---

Fix Effect spans starting a new trace under an active OpenTelemetry span whose span context exposes its ids through getters, such as dd-trace's, so they continue that trace.
