---
"effect": minor
---

Add trace sampling to the OTLP tracer. `OtlpTracer.layerFromConfig` follows `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`, `OtlpTracer.make` and `OtlpTracer.layer` accept a `sampler` option, and the `Otlp` layers accept it as `tracerSampler`. Unsupported `OTEL_TRACES_SAMPLER` values, such as `jaeger_remote`, fail the layer.
