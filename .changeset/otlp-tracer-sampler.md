---
"effect": minor
---

`OtlpTracer.layerFromConfig` and `Otlp.layerFromConfig` now follow `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`, and `OtlpTracer.make` and `OtlpTracer.layer` accept a `sampler` option. Unsupported sampler values, such as `jaeger_remote`, now fail the layer.
