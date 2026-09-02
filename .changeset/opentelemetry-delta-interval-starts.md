---
"@effect/opentelemetry": patch
---

Use the preceding collection time as the start of each OpenTelemetry delta counter, histogram, and frequency interval. This prevents overlapping delta intervals while preserving cumulative, gauge, and summary timestamps.
