---
"@effect/opentelemetry": patch
---

Honor the registered `MetricReader`'s preferred `AggregationTemporality` in `MetricProducerImpl`. Previously, every Sum-typed data point (Counter, UpDownCounter, Frequency, Summary count/sum) and Gauge/Histogram data point was stamped with a hardcoded `CUMULATIVE`, causing `OTLPMetricExporter({ temporalityPreference: DELTA })` (and any other non-default temporality preference on the reader/exporter) to be silently ignored. The producer now queries `reader.selectAggregationTemporality(instrumentType)` per produced data point, matching the OpenTelemetry spec. When no reader is registered, behavior is unchanged. Fixes #6253.
