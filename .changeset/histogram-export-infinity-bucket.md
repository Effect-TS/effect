---
"effect": patch
"@effect/opentelemetry": patch
---

Fix histogram exporters to retain all finite boundaries and overflow observations in OTLP, and emit a single `+Inf` bucket in Prometheus.
