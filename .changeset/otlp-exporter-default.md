---
"effect": minor
---

`Otlp.layerFromConfig` and the signal `layerFromConfig` layers now export when only an OTLP endpoint is set, because `OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER` and `OTEL_LOGS_EXPORTER` default to `otlp`. Set a variable to `none` to keep that signal off.
