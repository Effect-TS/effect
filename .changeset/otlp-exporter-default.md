---
"effect": minor
---

Default `OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER` and `OTEL_LOGS_EXPORTER` to `otlp` in the OTLP `layerFromConfig` layers, so configuring an OTLP endpoint enables export. Set a variable to `none` to disable that signal.
