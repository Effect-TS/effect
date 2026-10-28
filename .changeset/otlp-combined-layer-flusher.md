---
"effect": patch
---

Expose the shared `OtlpExporter.Flusher` from `Otlp.layer`, `Otlp.layerFromConfig`, `Otlp.layerJson` and `Otlp.layerProtobuf`. These layers already built the Flusher but typed their output as `never`, so a caller could not flush logs, metrics and traces together without merging the signal layers by hand.
