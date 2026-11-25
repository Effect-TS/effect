---
"effect": patch
---

Bound the OTLP pending export queue with configurable `maxQueueSize` and `onDrop`, cap each batch at `maxBatchSize` with configurable `concurrency` (default `4`, supporting `"unbounded"`, with `OtlpMetrics` serialized at `1`), and make `Flusher.flush` await all in-flight work and pre-flush items without cancelling shared exports on interruption.
