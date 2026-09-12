---
"@effect/opentelemetry": patch
---

`OtelMetrics` now honors the aggregation temporality preference of the registered `MetricReader`.

When no explicit `temporality` option is passed to `OtelMetrics.layer` or
`OtelMetrics.makeProducer`, the metric producer queries the reader's
`selectAggregationTemporality(instrumentType)` for each produced metric, so
exporters configured with a temporality preference (e.g.
`OTLPMetricExporter({ temporalityPreference: DELTA })`) are no longer silently
overridden with cumulative data points. An explicit `temporality` option still
takes precedence, and cumulative remains the default when the reader expresses
no preference.
