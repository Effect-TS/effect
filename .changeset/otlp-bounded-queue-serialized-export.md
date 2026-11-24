---
"effect": patch
---

Bound the OTLP export queue with configurable `maxQueueSize` and `onDrop`, serialize batch exports in FIFO order capped at `maxBatchSize`, and make `Flusher.flush` await in-flight work and pre-flush items without cancelling shared exports on interruption.
