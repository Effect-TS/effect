---
"effect": minor
---

`OtlpTracer.layerFromConfig` now follows `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`, and `OtlpTracer.make` and `OtlpTracer.layer` accept a `sampler` option, also exposed as `tracerSampler` on `Otlp.layer`, `Otlp.layerJson` and `Otlp.layerProtobuf`. Unsupported sampler values, such as `jaeger_remote`, now fail the layer.
