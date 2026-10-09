---
"effect": patch
"@effect/opentelemetry": patch
---

Fix histogram export for both kinds of boundaries. OTLP exports no longer drop the last custom boundary and the observations above it, and the Prometheus formatter no longer writes an extra `le="Infinity"` bucket next to `le="+Inf"` when the boundaries come from `Metric.linearBoundaries` or `Metric.exponentialBoundaries`.
