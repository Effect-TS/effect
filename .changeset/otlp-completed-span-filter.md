---
"effect": patch
---

Add `OtlpTracer.spanFilter` and `Otlp.tracerSpanFilter` options to filter completed sampled spans before OTLP conversion and buffering while preserving local span lifecycles and sampling propagation.
