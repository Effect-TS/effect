---
"effect": patch
---

`Otlp.layer`, `Otlp.layerFromConfig`, `Otlp.layerJson` and `Otlp.layerProtobuf` now declare the shared `OtlpExporter.Flusher` they provide, instead of `Layer<never>`.
